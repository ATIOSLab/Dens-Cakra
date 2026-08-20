import { Injectable, Logger } from '@nestjs/common';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { KpiExportQueryDto } from './kpi.dto.js';
import type { KpiService } from './kpi.service.js';

export type KpiExportFile = {
  filename: string;
  contentType: string;
  buffer: Buffer;
};

type ExportSection = {
  heading: string;
  paragraphs: string[];
  table?: { columns: string[]; rows: string[][] };
};

type ExportPayload = Awaited<ReturnType<KpiService['exportPayload']>>;

@Injectable()
export class KpiExportService {
  private readonly logger = new Logger(KpiExportService.name);

  constructor(private readonly prisma: PrismaService) {}

  async export(
    query: KpiExportQueryDto,
    context: AuthorizationContext,
    service: KpiService,
  ): Promise<KpiExportFile> {
    const payload = await service.exportPayload(query, context);
    const sections = this.buildSections(payload);

    let file: KpiExportFile;
    switch (query.format) {
      case 'excel':
        file = await this.toExcel(payload, sections);
        break;
      case 'word':
        file = await this.toWord(payload, sections);
        break;
      case 'pdf':
        file = await this.toPdf(payload, sections);
        break;
      case 'markdown':
      default:
        file = this.toMarkdown(payload, sections);
        break;
    }

    await this.writeAudit(context, query.format);
    return file;
  }

  private async writeAudit(context: AuthorizationContext, format: string) {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorUserProfileId: context.userProfileId,
          actorAssignmentId: context.primaryAssignmentId,
          action: 'KPI.EXPORT',
          category: 'DATA_ACCESS',
          severity: 'INFO',
          entityType: 'KpiReport',
          entityId: context.organizationUnitId,
          metadata: { format },
        },
      });
    } catch (error) {
      this.logger.warn(
        JSON.stringify({
          event: 'kpi_export_audit_failed',
          message: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  }

  private buildSections(payload: ExportPayload): ExportSection[] {
    const cards = payload.summary.cards;
    const statusGroups = payload.summary.statusBreakdown.groups;
    const insight = payload.summary.insight;
    return [
      {
        heading: 'Ringkasan Eksekutif',
        paragraphs: [
          `Periode evaluasi: ${payload.period.from} sampai ${payload.period.to} (${payload.period.timezone}).`,
          `Cakupan wilayah: ${payload.scope.label}.`,
          ...(insight?.topRegion
            ? [
                `Wilayah paling produktif: ${insight.topRegion.name} (${insight.topRegion.productivity}%).`,
              ]
            : []),
          ...(insight?.lowestRegion
            ? [
                `Wilayah paling rendah produktivitasnya: ${insight.lowestRegion.name} (${insight.lowestRegion.productivity}%).`,
              ]
            : []),
        ],
        table: {
          columns: ['Metrik', 'Nilai'],
          rows: cards.map((card) => [card.key, String(card.value)]),
        },
      },
      {
        heading: 'Status Jaring',
        paragraphs: [
          `Total Jaring: ${payload.summary.statusBreakdown.totalJaring}.`,
        ],
        table: {
          columns: ['Status', 'Jumlah'],
          rows: statusGroups.map((group) => [group.label, String(group.value)]),
        },
      },
      {
        heading: 'Produktivitas',
        paragraphs: [],
        table: {
          columns: [
            'Peringkat',
            'Wilayah',
            'Aktif Terverifikasi',
            'Produktif',
            'Belum Mengirim',
            'Total Laporan',
            'Menjadi Baket',
            'Produktivitas',
          ],
          rows: payload.regionComparison.rows.items.map((row) => [
            String(row.rank),
            row.name,
            String(row.activeVerified),
            String(row.productive),
            String(row.notReporting),
            String(row.totalReports),
            String(row.toBaket),
            `${row.productivity}%`,
          ]),
        },
      },
      {
        heading: 'Laporan Jaring dan Baket',
        paragraphs: [
          `Total Laporan Jaring: ${payload.reportsBaket.pipeline.total}.`,
          `Laporan menjadi Baket: ${payload.reportsBaket.pipeline.toBaket} (${payload.reportsBaket.pipeline.conversionPercent}%).`,
          `Baket dari laporan: ${payload.reportsBaket.baket.fromReport}; Baket manual: ${payload.reportsBaket.baket.manual}.`,
        ],
      },
      {
        heading: 'Kendala WhatsApp Center',
        paragraphs: [
          `Aktif: ${payload.whatsappCenter.summary.active}; Tidak aktif: ${payload.whatsappCenter.summary.inactive}; Terputus: ${payload.whatsappCenter.summary.disconnected}.`,
          `Kejadian gangguan: ${payload.whatsappCenter.incidents.length}.`,
        ],
      },
      {
        heading: 'Anomali',
        paragraphs: [`Total anomali: ${payload.anomalies.total}.`],
        table: {
          columns: [
            'No.',
            'Jenis Anomali',
            'Jumlah Jaring',
            'Jumlah Kejadian',
            'Keterangan',
          ],
          rows: payload.anomalies.rows.map((row) => [
            String(row.no ?? '-'),
            row.type,
            String(row.jaringCount),
            String(row.eventCount),
            row.description,
          ]),
        },
      },
      {
        heading: 'Keterangan',
        paragraphs: [
          'Laporan dibuat otomatis oleh sistem DENS CAKRA. Angka mengikuti cakupan hak akses pengguna dan filter yang diterapkan.',
        ],
      },
    ];
  }

  private toMarkdown(
    payload: ExportPayload,
    sections: ExportSection[],
  ): KpiExportFile {
    const lines: string[] = [];
    lines.push('# Laporan KPI DENS CAKRA');
    lines.push('');
    lines.push(
      `- Periode: ${payload.period.from} sampai ${payload.period.to} (${payload.period.timezone})`,
    );
    lines.push(`- Cakupan: ${payload.scope.label}`);
    lines.push(`- Dibuat: ${payload.generatedAt}`);
    lines.push('');
    for (const section of sections) {
      lines.push(`## ${section.heading}`);
      lines.push('');
      for (const paragraph of section.paragraphs) {
        lines.push(paragraph);
        lines.push('');
      }
      if (section.table) {
        lines.push(`| ${section.table.columns.join(' | ')} |`);
        lines.push(`| ${section.table.columns.map(() => '---').join(' | ')} |`);
        for (const row of section.table.rows) {
          lines.push(`| ${row.join(' | ')} |`);
        }
        lines.push('');
      }
    }
    return {
      filename: 'laporan-kpi-dens-cakra.md',
      contentType: 'text/markdown; charset=utf-8',
      buffer: Buffer.from(lines.join('\n'), 'utf-8'),
    };
  }

  private async toExcel(
    _payload: ExportPayload,
    sections: ExportSection[],
  ): Promise<KpiExportFile> {
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    for (const section of sections) {
      const sheet = workbook.addWorksheet(section.heading.slice(0, 31));
      if (section.paragraphs.length) {
        sheet.addRow([section.heading]);
        for (const paragraph of section.paragraphs) sheet.addRow([paragraph]);
        sheet.addRow([]);
      }
      if (section.table) {
        sheet.addRow(section.table.columns);
        for (const row of section.table.rows) sheet.addRow(row);
      }
      sheet.columns.forEach((column) => {
        column.width = 24;
      });
    }
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    return {
      filename: 'laporan-kpi-dens-cakra.xlsx',
      contentType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer,
    };
  }

  private async toWord(
    payload: ExportPayload,
    sections: ExportSection[],
  ): Promise<KpiExportFile> {
    const {
      Document,
      Packer,
      Paragraph,
      TextRun,
      HeadingLevel,
      Table,
      TableRow,
      TableCell,
      WidthType,
    } = await import('docx');
    const children: Array<
      InstanceType<typeof Paragraph> | InstanceType<typeof Table>
    > = [
      new Paragraph({
        text: 'Laporan KPI DENS CAKRA',
        heading: HeadingLevel.HEADING_1,
      }),
      new Paragraph({
        children: [
          new TextRun(
            `Periode: ${payload.period.from} sampai ${payload.period.to} (${payload.period.timezone})`,
          ),
        ],
      }),
      new Paragraph({
        children: [new TextRun(`Cakupan: ${payload.scope.label}`)],
      }),
    ];
    for (const section of sections) {
      children.push(
        new Paragraph({
          text: section.heading,
          heading: HeadingLevel.HEADING_2,
        }),
      );
      for (const paragraph of section.paragraphs) {
        children.push(new Paragraph({ children: [new TextRun(paragraph)] }));
      }
      if (section.table) {
        children.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: section.table.columns.map(
                  (column) =>
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [new TextRun({ text: column, bold: true })],
                        }),
                      ],
                    }),
                ),
              }),
              ...section.table.rows.map(
                (row) =>
                  new TableRow({
                    children: row.map(
                      (cell) =>
                        new TableCell({ children: [new Paragraph(cell)] }),
                    ),
                  }),
              ),
            ],
          }),
        );
      }
    }
    const document = new Document({ sections: [{ children }] });
    const buffer = await Packer.toBuffer(document);
    return {
      filename: 'laporan-kpi-dens-cakra.docx',
      contentType:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      buffer,
    };
  }

  private async toPdf(
    payload: ExportPayload,
    sections: ExportSection[],
  ): Promise<KpiExportFile> {
    const PDFDocument = (await import('pdfkit')).default;
    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    const done = new Promise<void>((resolve) => doc.on('end', () => resolve()));

    doc.fontSize(18).text('Laporan KPI DENS CAKRA');
    doc.moveDown(0.4);
    doc
      .fontSize(10)
      .text(
        `Periode: ${payload.period.from} sampai ${payload.period.to} (${payload.period.timezone})`,
      );
    doc.text(`Cakupan: ${payload.scope.label}`);
    doc.moveDown(0.6);

    for (const section of sections) {
      doc.moveDown(0.5);
      doc.fontSize(13).text(section.heading);
      doc.moveDown(0.2);
      doc.fontSize(10);
      for (const paragraph of section.paragraphs) {
        doc.text(paragraph, { width: 500 });
      }
      if (section.table) {
        doc.moveDown(0.2);
        const columnWidth = 500 / section.table.columns.length;
        doc.fontSize(8);
        const drawRow = (cells: string[], bold = false) => {
          cells.forEach((cell, index) => {
            doc
              .font('Helvetica' + (bold ? '-Bold' : ''))
              .text(cell.slice(0, 40), 48 + index * columnWidth, doc.y, {
                width: columnWidth,
                height: 14,
              });
          });
          doc.moveDown(0.9);
        };
        drawRow(section.table.columns, true);
        for (const row of section.table.rows) drawRow(row);
      }
    }

    doc.end();
    await done;
    return {
      filename: 'laporan-kpi-dens-cakra.pdf',
      contentType: 'application/pdf',
      buffer: Buffer.concat(chunks),
    };
  }
}
