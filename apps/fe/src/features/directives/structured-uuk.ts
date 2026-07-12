export const STR_UUK_SECTION_BLUEPRINT = [
  ["BASIS_BACKGROUND", "Dasar dan Latar Belakang"],
  ["INVESTIGATION_TARGETS", "Sasaran Penyelidikan"],
  ["EEI_PIR", "EEI / PIR"],
  ["COLLECTION_PLAN", "Rencana Pengumpulan"],
  ["THREAT_RISK_ANALYSIS", "Analisis Ancaman dan Risiko"],
  ["IMPLEMENTATION_MECHANISM", "Mekanisme Pelaksanaan"],
  ["COORDINATION_REPORTING", "Koordinasi dan Pelaporan"],
  ["RECOMMENDATION", "Rekomendasi"],
  ["AUTHENTICATION", "Pengesahan"],
] as const;

const STR_UUK_MARKER_START = "<!--DENS_CAKRA_STR_UUK_START-->";
const STR_UUK_MARKER_END = "<!--DENS_CAKRA_STR_UUK_END-->";

export type StructuredDirectiveUukSection = {
  sectionType: string;
  title: string;
  orderNumber: number;
  content: string;
};

type StoredDirectiveUukPayload = {
  title?: string;
  sections?: Array<{
    sectionType?: string;
    title?: string;
    orderNumber?: number;
    content?: string;
  }>;
};

export function buildStructuredDirectiveUukSections(
  input?: Array<Partial<StructuredDirectiveUukSection>>,
): StructuredDirectiveUukSection[] {
  return STR_UUK_SECTION_BLUEPRINT.map(([sectionType, title], index) => {
    const existing = input?.find((item) => item.sectionType === sectionType);

    return {
      sectionType,
      title,
      orderNumber: index + 1,
      content: existing?.content?.trim() ?? "",
    };
  });
}

export function parseDirectiveCommandDescription(value?: string | null) {
  if (!value) {
    return {
      uukTitle: "",
      uukSections: buildStructuredDirectiveUukSections(),
      commandNarrative: "",
      hasStructuredUuk: false,
    };
  }

  const markerStart = value.indexOf(STR_UUK_MARKER_START);
  const markerEnd = value.indexOf(STR_UUK_MARKER_END);

  if (markerStart === -1 || markerEnd === -1 || markerEnd <= markerStart) {
    return {
      uukTitle: "",
      uukSections: buildStructuredDirectiveUukSections(),
      commandNarrative: value.trim(),
      hasStructuredUuk: false,
    };
  }

  const payloadText = value.slice(markerStart + STR_UUK_MARKER_START.length, markerEnd).trim();
  const narrativeText = value.slice(markerEnd + STR_UUK_MARKER_END.length).trim();

  try {
    const payload = JSON.parse(payloadText) as StoredDirectiveUukPayload;

    return {
      uukTitle: payload.title?.trim() ?? "",
      uukSections: buildStructuredDirectiveUukSections(payload.sections),
      commandNarrative: narrativeText,
      hasStructuredUuk: true,
    };
  } catch {
    return {
      uukTitle: "",
      uukSections: buildStructuredDirectiveUukSections(),
      commandNarrative: value.trim(),
      hasStructuredUuk: false,
    };
  }
}

export function serializeDirectiveCommandDescription(input: {
  commandNarrative: string;
  uukTitle: string;
  uukSections: StructuredDirectiveUukSection[];
}) {
  const payload = {
    title: input.uukTitle.trim(),
    sections: input.uukSections.map((section) => ({
      sectionType: section.sectionType,
      title: section.title,
      orderNumber: section.orderNumber,
      content: section.content.trim(),
    })),
  };

  return [STR_UUK_MARKER_START, JSON.stringify(payload), STR_UUK_MARKER_END, input.commandNarrative.trim()]
    .filter(Boolean)
    .join("\n");
}

export function countFilledStructuredSections(sections: StructuredDirectiveUukSection[]) {
  return sections.filter((section) => section.content.trim().length > 0).length;
}

export function buildDirectiveUukSummary(sections: StructuredDirectiveUukSection[]) {
  return sections
    .filter((section) => section.content.trim().length > 0)
    .slice(0, 3)
    .map((section) => section.title)
    .join(", ");
}
