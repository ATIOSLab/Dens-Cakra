import React from "react";

import { Page, Text, View } from "@react-pdf/renderer";

import type { JaringReportData } from "../../types/jaring-report.types";
import { DkiMap } from "../../visualizations/dki-map";
import { PageFooter } from "../components/page-footer";
import { PageHeader } from "../components/page-header";
import { CONTENT_WIDTH, reportStyles } from "../report-styles";

interface MapPageProps {
  data: JaringReportData;
}

export function MapPage({ data }: MapPageProps) {
  const swatches = [
    { color: "#f1f5f9", border: "#cbd5e1", label: "0 Jaring" },
    { color: "#e0f2fe", border: "#bae6fd", label: "Rendah (1–25%)" },
    { color: "#7dd3fc", border: "#38bdf8", label: "Sedang (26–50%)" },
    { color: "#0284c7", border: "#0284c7", label: "Tinggi (51–75%)" },
    { color: "#0369a1", border: "#0369a1", label: "Sangat Tinggi (76–100%)" },
  ];

  return (
    <Page size="A4" orientation="landscape" style={reportStyles.page}>
      <PageHeader
        title="PETA GEOGRAFIS SEBARAN JARING: PROVINSI DKI JAKARTA"
        subtitle="Visualisasi sebaran densitas jaring terverifikasi di 6 Kota/Kabupaten Administrasi DKI Jakarta."
      />

      <View style={{ marginTop: 6, marginBottom: 8, alignItems: "center" }}>
        <DkiMap dkiCounts={data.wilayah.dkiCounts} total={data.summary.total} />
      </View>

      {/* Legend & Scope Info Box */}
      <View
        style={{
          width: CONTENT_WIDTH,
          height: 52,
          backgroundColor: "#f8fafc",
          borderWidth: 0.75,
          borderColor: "#cbd5e1",
          padding: 8,
          flexDirection: "row",
          justifyContent: "space-between",
        }}
      >
        {/* Left: Swatches */}
        <View>
          <Text
            style={{
              fontSize: 8,
              fontFamily: "Helvetica-Bold",
              color: "#0f172a",
              marginBottom: 6,
            }}
          >
            LEGENDA TINGKAT PERSEBARAN WILAYAH:
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {swatches.map((s, idx) => (
              <View
                key={idx}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginRight: 16,
                }}
              >
                <View
                  style={{
                    width: 10,
                    height: 10,
                    backgroundColor: s.color,
                    borderWidth: 0.5,
                    borderColor: s.border,
                    marginRight: 5,
                  }}
                />
                <Text
                  style={{
                    fontSize: 7.5,
                    fontFamily: "Helvetica",
                    color: "#334155",
                  }}
                >
                  {s.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Right: Info */}
        <View style={{ alignItems: "flex-end", justifyContent: "center" }}>
          <Text
            style={{
              fontSize: 7.5,
              fontFamily: "Helvetica-Bold",
              color: "#0f172a",
            }}
          >
            CAKUPAN: 6 Kota/Kabupaten Administrasi DKI Jakarta
          </Text>
          <Text
            style={{
              fontSize: 7.5,
              fontFamily: "Helvetica",
              color: "#475569",
              marginTop: 2,
            }}
          >
            {`Total Basis Data: ${data.summary.total.toLocaleString("id-ID")} Jaring Terverifikasi`}
          </Text>
          <Text
            style={{
              fontSize: 7,
              fontFamily: "Helvetica-Oblique",
              color: "#64748b",
              marginTop: 2,
            }}
          >
            Sumber Data Sinkron: Profiling & Rekapitulasi Jaring Intelijen
          </Text>
        </View>
      </View>

      <PageFooter />
    </Page>
  );
}
