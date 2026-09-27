import React from "react";

import { Document, Page, Text, View } from "@react-pdf/renderer";

import type { JaringReportData } from "../types/jaring-report.types";
import { PageFooter } from "./components/page-footer";
import { PageHeader } from "./components/page-header";
import { CoverPage } from "./pages/cover-page";
import { InfographicPage1 } from "./pages/infographic-page-1";
import { InfographicPage2 } from "./pages/infographic-page-2";
import { MapPage } from "./pages/map-page";
import { ProfilingPages } from "./pages/profiling-pages";
import { RecapTerritoryPage } from "./pages/recap-territory-page";
import { TocPage } from "./pages/toc-page";
import { reportStyles } from "./report-styles";

interface JaringReportDocumentProps {
  data: JaringReportData;
}

export function JaringReportDocument({ data }: JaringReportDocumentProps) {
  const hasItems = data.items && data.items.length > 0;

  return (
    <Document
      title={data.meta.title}
      author="Badan Intelijen Negara - DENS Cakra"
      subject="Buku Profiling dan Rekapitulasi Data Jaring"
      creator="DENS Cakra Reporting Engine"
    >
      {/* 1. Cover Page */}
      {data.meta.options.includeCover ? <CoverPage data={data} /> : null}

      {/* 2. Map Page */}
      {data.meta.options.includeMap && hasItems ? <MapPage data={data} /> : null}

      {/* 3. Infographic Pages */}
      {data.meta.options.includeInfographic && hasItems ? (
        <>
          <InfographicPage1 data={data} />
          <InfographicPage2 data={data} />
        </>
      ) : null}

      {/* 4. Table of Contents */}
      {data.meta.options.includeToc && hasItems ? <TocPage data={data} /> : null}

      {/* 5. Territory Recap Page */}
      {data.meta.options.includeRecap && hasItems ? <RecapTerritoryPage data={data} /> : null}

      {/* 6. Profiling Dossier Pages */}
      {hasItems ? (
        <ProfilingPages data={data} />
      ) : (
        <Page size="A4" orientation="landscape" style={reportStyles.page}>
          <PageHeader
            title={data.meta.title}
            subtitle="Tidak ada data jaring yang sesuai dengan kriteria filter yang dipilih."
          />
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontFamily: "Helvetica-Bold",
                color: "#64748b",
              }}
            >
              Belum ada data jaring terverifikasi (Approved) untuk cakupan ini.
            </Text>
          </View>
          <PageFooter />
        </Page>
      )}
    </Document>
  );
}
