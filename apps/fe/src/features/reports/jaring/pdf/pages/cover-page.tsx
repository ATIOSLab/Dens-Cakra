import React from "react";

import { Page, Text, View } from "@react-pdf/renderer";

import type { JaringReportData } from "../../types/jaring-report.types";
import { reportStyles } from "../report-styles";

interface CoverPageProps {
  data: JaringReportData;
}

export function CoverPage({ data }: CoverPageProps) {
  const areaName = data.meta.area?.name ? data.meta.area.name.toUpperCase() : "SELURUH WILAYAH OPERASIONAL";

  return (
    <Page size="A4" orientation="landscape" style={reportStyles.coverPage}>
      <View style={reportStyles.coverOuterBorder}>
        <View style={reportStyles.coverInnerBorder}>
          <Text style={reportStyles.coverAgency}>BADAN INTELIJEN NEGARA</Text>
          <Text style={reportStyles.coverDeputy}>DEPUTI BIDANG INTELIJEN DALAM NEGERI</Text>
          <Text style={reportStyles.coverSystem}>
            DENS CAKRA - SISTEM INFORMASI PENGGALANGAN & PENJARINGAN INTELIJEN
          </Text>

          <View style={reportStyles.coverDivider} />

          <Text style={reportStyles.coverTitle}>{data.meta.title.toUpperCase()}</Text>
          <Text style={reportStyles.coverSubtitle}>
            REKAPITULASI STATUS OPERASIONAL & DOSIR PROFILING JARING TERVERIFIKASI
          </Text>

          <Text style={reportStyles.coverAreaBadge}>{`CAKUPAN WILAYAH: ${areaName}`}</Text>

          <Text style={reportStyles.coverStatusDesc}>
            Dokumen ini memuat data jaring intelijen yang telah diverifikasi dan disetujui (Approved) secara berjenjang.
          </Text>

          <Text style={reportStyles.coverTotalDesc}>
            {`TOTAL BASIS DATA: ${data.summary.total.toLocaleString("id-ID")} JARING INTELIJEN`}
          </Text>
        </View>
      </View>
    </Page>
  );
}
