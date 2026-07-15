import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiException } from '../../common/api/api-exception.js';
import {
  DirectiveAiScope,
  type GenerateDirectiveAiDto,
} from './directive.dto.js';

const SECTION_TYPES = [
  'BASIS_BACKGROUND',
  'INVESTIGATION_TARGETS',
  'EEI_PIR',
  'COLLECTION_PLAN',
  'THREAT_RISK_ANALYSIS',
  'IMPLEMENTATION_MECHANISM',
  'COORDINATION_REPORTING',
  'RECOMMENDATION',
  'AUTHENTICATION',
] as const;

type DirectiveAiResult = {
  title?: string;
  commandNarrative?: string;
  sections: Record<string, string>;
};

type ChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
};

function hasSequentialMarkers(
  text: string,
  pattern: RegExp,
  alphabetic = false,
) {
  const values = Array.from(text.matchAll(pattern), (match) =>
    alphabetic
      ? match[1].toLowerCase().charCodeAt(0)
      : Number.parseInt(match[1], 10),
  );

  return values.some((value, index) =>
    values.slice(index + 1).includes(value + 1),
  );
}

export function formatDirectiveAiText(text: string) {
  let formatted = text.trim();

  if (hasSequentialMarkers(formatted, /(?:^|[ \t])(\d{1,2})[.)]\s+/gm)) {
    formatted = formatted.replace(
      /(^|[ \t]+)(\d{1,2}[.)])\s+/gm,
      (_match, leading: string, marker: string) =>
        `${leading ? '\n' : ''}${marker} `,
    );
  }

  if (hasSequentialMarkers(formatted, /(?:^|[ \t])([a-z])[.)]\s+/gim, true)) {
    formatted = formatted.replace(
      /(^|[ \t]+)([a-z][.)])\s+/gim,
      (_match, leading: string, marker: string) =>
        `${leading ? '\n' : ''}${marker} `,
    );
  }

  return formatted.replace(/\n{3,}/g, '\n\n');
}

@Injectable()
export class DirectiveAiService {
  constructor(private readonly config: ConfigService) {}

  async generate(input: GenerateDirectiveAiDto): Promise<DirectiveAiResult> {
    const strategicIssue = input.strategicIssue.trim();

    if (!strategicIssue) {
      throw new ApiException(
        'DIRECTIVE_AI_STRATEGIC_ISSUE_REQUIRED',
        'Isu Strategis wajib diisi sebelum menggunakan AI Recommendation.',
        400,
      );
    }

    const baseUrl = this.config
      .get<string>('AI_ROUTER_BASE_URL')
      ?.replace(/\/$/, '');
    const apiKey = this.config.get<string>('AI_ROUTER_API_KEY');
    const model = this.config.get<string>('AI_ROUTER_MODEL');

    if (!baseUrl || !apiKey || !model) {
      return this.buildLocalFallback(input, strategicIssue);
    }

    let response: Response;

    try {
      response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          temperature: input.scope === DirectiveAiScope.POLISH ? 0.25 : 0.45,
          max_tokens: 6000,
          messages: [
            { role: 'system', content: this.systemPrompt() },
            { role: 'user', content: this.userPrompt(input, strategicIssue) },
          ],
        }),
        signal: AbortSignal.timeout(90_000),
      });
    } catch {
      throw new ApiException(
        'DIRECTIVE_AI_UNAVAILABLE',
        'Layanan AI tidak dapat dihubungi. Silakan coba kembali.',
        502,
      );
    }

    const payload = (await response
      .json()
      .catch(() => null)) as ChatCompletionResponse | null;

    if (!response.ok) {
      throw new ApiException(
        'DIRECTIVE_AI_UPSTREAM_ERROR',
        payload?.error?.message || 'Layanan AI gagal menghasilkan rekomendasi.',
        502,
      );
    }

    const content = payload?.choices?.[0]?.message?.content;

    if (!content) {
      throw new ApiException(
        'DIRECTIVE_AI_EMPTY_RESPONSE',
        'Layanan AI tidak memberikan hasil yang dapat digunakan.',
        502,
      );
    }

    return this.normalizeResult(this.parseJson(content), input.scope);
  }

  private systemPrompt() {
    return [
      'Anda adalah analis senior yang menyusun dokumen UK/STR Direktif Strategis dalam Bahasa Indonesia formal.',
      'Semua keluaran wajib diturunkan secara spesifik dari Isu Strategis yang diberikan, faktual, operasional, terukur, dan tidak mengarang fakta sebagai kepastian.',
      'Gunakan istilah yang profesional dan rumusan yang siap ditinjau pimpinan.',
      'Jika menggunakan daftar bernomor atau berhuruf, tulis setiap item pada baris baru; jangan gabungkan beberapa item dalam satu baris.',
      'Balas hanya dengan satu objek JSON valid tanpa markdown, komentar, atau teks tambahan.',
    ].join(' ');
  }

  private getContextStringArray(
    context: Record<string, unknown> | undefined,
    key: string,
  ) {
    const value = context?.[key];

    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string')
      : [];
  }

  private buildLocalFallback(
    input: GenerateDirectiveAiDto,
    strategicIssue: string,
  ): DirectiveAiResult {
    const targetAreas = this.getContextStringArray(input.context, 'targetAreas');
    const areaLabel = targetAreas.length
      ? targetAreas.join(', ')
      : 'wilayah sasaran yang dipilih';
    const title =
      input.title?.trim() ||
      `Penguatan operasi intelijen terhadap isu ${strategicIssue.slice(0, 90)}`;
    const commandNarrative =
      input.commandNarrative?.trim() ||
      [
        `Melaksanakan operasi intelijen terarah pada ${areaLabel} untuk memperoleh informasi strategis terkait ${strategicIssue}.`,
        'Seluruh jajaran penerima STR wajib menyusun rencana pengumpulan, memperbarui perkembangan secara berjenjang, dan menjaga validitas informasi sebelum digunakan sebagai dasar keputusan.',
      ].join(' ');

    const generatedSections: Record<string, string> = {
      BASIS_BACKGROUND: [
        `Isu strategis yang menjadi dasar penugasan adalah ${strategicIssue}.`,
        `Kegiatan diarahkan pada ${areaLabel} dengan fokus pemetaan indikasi, aktor, pola kegiatan, jalur dukungan, serta potensi eskalasi yang relevan.`,
      ].join('\n'),
      INVESTIGATION_TARGETS: [
        `1. Mengidentifikasi pihak, jaringan, lokasi, dan pola aktivitas yang berkaitan dengan ${strategicIssue}.`,
        `2. Memetakan titik rawan dan hubungan antarwilayah pada ${areaLabel}.`,
        '3. Menilai dampak operasional terhadap stabilitas keamanan dan kepentingan strategis nasional.',
      ].join('\n'),
      EEI_PIR: [
        `1. Apa indikator utama yang menguatkan perkembangan isu ${strategicIssue}?`,
        `2. Siapa aktor, simpul, atau jaringan yang berperan pada ${areaLabel}?`,
        '3. Bagaimana pola komunikasi, mobilitas, dukungan logistik, dan pembiayaan yang terindikasi?',
        '4. Apa potensi eskalasi, dampak, dan kebutuhan respons lanjutan?',
      ].join('\n'),
      COLLECTION_PLAN: [
        '1. Mengumpulkan informasi awal dari sumber terbuka, laporan lapangan, dan data internal yang tersedia.',
        '2. Memvalidasi informasi melalui koordinasi berjenjang antara Regional Commander, OIM, Field Coordinator, dan Field Officer.',
        `3. Memprioritaskan pengumpulan pada titik rawan di ${areaLabel}.`,
        '4. Menyusun pembaruan berkala berisi temuan, penilaian, dan kebutuhan tindak lanjut.',
      ].join('\n'),
      THREAT_RISK_ANALYSIS: [
        `Isu ${strategicIssue} dinilai berpotensi memunculkan risiko operasional apabila indikator awal tidak segera diverifikasi.`,
        'Risiko utama mencakup perluasan jaringan, perpindahan aktivitas antarwilayah, kesenjangan informasi, dan keterlambatan respons lapangan.',
      ].join('\n'),
      IMPLEMENTATION_MECHANISM: [
        '1. Regional Commander menjabarkan STR menjadi arahan operasional regional.',
        '2. OIM menyusun kebutuhan informasi dan rencana pengumpulan.',
        '3. Field Coordinator mengoordinasikan penugasan lapangan.',
        '4. Field Officer melaksanakan pengumpulan dan pelaporan sesuai area tanggung jawab.',
      ].join('\n'),
      COORDINATION_REPORTING: [
        'Pelaporan dilakukan secara berjenjang melalui kanal resmi DENS CAKRA.',
        'Setiap informasi wajib mencantumkan sumber, waktu perolehan, lokasi, tingkat keyakinan, dan rekomendasi tindak lanjut.',
      ].join('\n'),
      RECOMMENDATION: [
        `1. Prioritaskan validasi informasi terkait ${strategicIssue} pada ${areaLabel}.`,
        '2. Susun pembaruan situasi berkala untuk pimpinan.',
        '3. Tingkatkan koordinasi lintas unit bila ditemukan indikasi perluasan wilayah atau eskalasi ancaman.',
      ].join('\n'),
      AUTHENTICATION:
        'Dokumen ini disusun sebagai draft awal dan wajib ditinjau pejabat berwenang sebelum dipublikasikan atau didistribusikan.',
    };

    const existingSections = Object.fromEntries(
      SECTION_TYPES.map((key) => {
        const value = input.sections?.[key];
        return [key, typeof value === 'string' ? value.trim() : ''];
      }),
    );
    const sectionFrom = (key: (typeof SECTION_TYPES)[number]) =>
      input.scope === DirectiveAiScope.POLISH
        ? generatedSections[key] || existingSections[key]
        : generatedSections[key];

    if (input.scope === DirectiveAiScope.EEI) {
      return { sections: { EEI_PIR: sectionFrom('EEI_PIR') } };
    }

    if (input.scope === DirectiveAiScope.COLLECTION) {
      return { sections: { COLLECTION_PLAN: sectionFrom('COLLECTION_PLAN') } };
    }

    if (input.scope === DirectiveAiScope.RECOMMENDATION) {
      return { sections: { RECOMMENDATION: sectionFrom('RECOMMENDATION') } };
    }

    return {
      title,
      commandNarrative,
      sections: Object.fromEntries(
        SECTION_TYPES.map((key) => [key, sectionFrom(key)]),
      ),
    };
  }

  private userPrompt(input: GenerateDirectiveAiDto, strategicIssue: string) {
    const existing = {
      title: input.title?.trim() || '',
      commandNarrative: input.commandNarrative?.trim() || '',
      sections: Object.fromEntries(
        SECTION_TYPES.map((key) => {
          const value = input.sections?.[key];
          return [key, typeof value === 'string' ? value.trim() : ''];
        }),
      ),
    };

    const scopeInstruction: Record<DirectiveAiScope, string> = {
      [DirectiveAiScope.FULL]:
        'Susun judul, uraian perintah, dan seluruh 9 bagian. Setiap bagian harus substantif dan langsung terkait dengan isu.',
      [DirectiveAiScope.EEI]:
        'Susun hanya sections.EEI_PIR berupa pertanyaan/kebutuhan informasi prioritas yang spesifik dan dapat dikumpulkan.',
      [DirectiveAiScope.COLLECTION]:
        'Susun hanya sections.COLLECTION_PLAN berupa rencana pengumpulan yang bertahap, terukur, dan relevan dengan isu.',
      [DirectiveAiScope.RECOMMENDATION]:
        'Susun hanya sections.RECOMMENDATION berupa saran tindak yang konkret, berprioritas, dan relevan dengan isu.',
      [DirectiveAiScope.POLISH]:
        'Ubah judul, uraian perintah, dan seluruh bagian menjadi gaya penulisan produk intelijen yang objektif, padat, analitis, dan berorientasi pada kebutuhan keputusan. Bedakan fakta, indikasi, penilaian, potensi ancaman, risiko, serta implikasi operasional. Gunakan istilah seperti "terindikasi", "dinilai", dan "berpotensi" hanya ketika didukung konteks. Pertahankan substansi yang tersedia, jangan menambah nama, lokasi, waktu, peristiwa, atau fakta yang tidak diberikan. Isi bagian kosong berdasarkan isu strategis dengan rumusan sebagai penilaian atau kebutuhan informasi, bukan sebagai fakta baru.',
    };

    const expectedKeys =
      input.scope === DirectiveAiScope.EEI
        ? ['EEI_PIR']
        : input.scope === DirectiveAiScope.COLLECTION
          ? ['COLLECTION_PLAN']
          : input.scope === DirectiveAiScope.RECOMMENDATION
            ? ['RECOMMENDATION']
            : SECTION_TYPES;

    return [
      `ISU STRATEGIS:\n${strategicIssue}`,
      `AKSI:\n${scopeInstruction[input.scope]}`,
      `ISI FORM SAAT INI:\n${JSON.stringify(existing)}`,
      `KONTEKS FORM LAIN:\n${JSON.stringify(input.context ?? {})}`,
      'Format JSON yang wajib dikembalikan:',
      JSON.stringify({
        title:
          input.scope === DirectiveAiScope.FULL ||
          input.scope === DirectiveAiScope.POLISH
            ? 'string'
            : undefined,
        commandNarrative:
          input.scope === DirectiveAiScope.FULL ||
          input.scope === DirectiveAiScope.POLISH
            ? 'string'
            : undefined,
        sections: Object.fromEntries(
          expectedKeys.map((key) => [key, 'string']),
        ),
      }),
    ].join('\n\n');
  }

  private parseJson(content: string): unknown {
    const trimmed = content
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '');

    try {
      return JSON.parse(trimmed);
    } catch {
      const start = trimmed.indexOf('{');
      const end = trimmed.lastIndexOf('}');

      if (start >= 0 && end > start) {
        try {
          return JSON.parse(trimmed.slice(start, end + 1));
        } catch {
          // Fall through to the consistent API error below.
        }
      }

      throw new ApiException(
        'DIRECTIVE_AI_INVALID_RESPONSE',
        'Format hasil dari layanan AI tidak valid. Silakan generate ulang.',
        502,
      );
    }
  }

  private normalizeResult(
    value: unknown,
    scope: DirectiveAiScope,
  ): DirectiveAiResult {
    if (!value || typeof value !== 'object') {
      throw new ApiException(
        'DIRECTIVE_AI_INVALID_RESPONSE',
        'Format hasil dari layanan AI tidak valid. Silakan generate ulang.',
        502,
      );
    }

    const candidate = value as Record<string, unknown>;
    const rawSections =
      candidate.sections && typeof candidate.sections === 'object'
        ? (candidate.sections as Record<string, unknown>)
        : {};
    const allowedSections =
      scope === DirectiveAiScope.EEI
        ? ['EEI_PIR']
        : scope === DirectiveAiScope.COLLECTION
          ? ['COLLECTION_PLAN']
          : scope === DirectiveAiScope.RECOMMENDATION
            ? ['RECOMMENDATION']
            : SECTION_TYPES;
    const sections = Object.fromEntries(
      allowedSections.flatMap((key) => {
        const content = rawSections[key];
        return typeof content === 'string' && content.trim()
          ? [[key, formatDirectiveAiText(content)]]
          : [];
      }),
    );
    const title =
      typeof candidate.title === 'string' ? candidate.title.trim() : undefined;
    const commandNarrative =
      typeof candidate.commandNarrative === 'string'
        ? formatDirectiveAiText(candidate.commandNarrative)
        : undefined;

    if (!Object.keys(sections).length && !title && !commandNarrative) {
      throw new ApiException(
        'DIRECTIVE_AI_EMPTY_RESPONSE',
        'Layanan AI tidak memberikan hasil yang dapat digunakan.',
        502,
      );
    }

    return { title, commandNarrative, sections };
  }
}
