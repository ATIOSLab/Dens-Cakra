import React from "react";

import { Page, Text, View } from "@react-pdf/renderer";

import type { JaringReportData } from "../../types/jaring-report.types";
import { PageFooter } from "../components/page-footer";
import { PageHeader } from "../components/page-header";
import { CONTENT_WIDTH, reportStyles } from "../report-styles";

interface TocPageProps {
  data: JaringReportData;
}

export function TocPage({ data }: TocPageProps) {
  type TocItem = {
    title: string;
    subtitle?: string;
    isSub: boolean;
  };

  const items: TocItem[] = [];

  if (data.meta.options.includeMap) {
    items.push({
      title: "Peta Sebaran Jaring Intelijen DKI Jakarta",
      subtitle: "Visualisasi geografis 6 wilayah administrasi",
      isSub: false,
    });
  }

  if (data.meta.options.includeInfographic) {
    items.push({
      title: "Infografis: Sebaran Wilayah & Status Operasional",
      subtitle: "Sebaran kota, status aktif/pasif, dan komposisi gender",
      isSub: false,
    });
    items.push({
      title: "Infografis: Demografi Usia, Generasi & Pekerjaan",
      subtitle: "Komposisi usia, generasi, dan word cloud profesi",
      isSub: false,
    });
  }

  if (data.meta.options.includeRecap) {
    items.push({
      title: "Rekapitulasi Persebaran Wilayah & Klasifikasi",
      subtitle: "Tabel agregasi hierarki wilayah dan profesi",
      isSub: false,
    });
  }

  // Profiling sections
  for (const prov of data.groups) {
    items.push({
      title: `Dosir Profiling: ${prov.provinceName}`,
      subtitle: `${prov.totalJaring.toLocaleString("id-ID")} Jaring Terverifikasi`,
      isSub: false,
    });

    for (const city of prov.cities) {
      items.push({
        title: city.cityName,
        subtitle: `${city.totalJaring.toLocaleString("id-ID")} Orang (${city.districts.length} Kecamatan)`,
        isSub: true,
      });
    }
  }

  // Split into 2 columns if more than 10 items
  const midPoint = Math.ceil(items.length / 2);
  const leftCol = items.slice(0, midPoint);
  const rightCol = items.slice(midPoint);

  return (
    <Page size="A4" orientation="landscape" style={reportStyles.page}>
      <PageHeader
        title="DAFTAR ISI LAPORAN"
        subtitle="Struktur dokumen rekapitulasi operasional dan buku profiling jaring terverifikasi."
      />

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: 10,
        }}
      >
        {/* Left Column */}
        <View style={{ width: (CONTENT_WIDTH - 24) / 2 }}>
          {leftCol.map((item, idx) => (
            <View
              key={idx}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 5,
                paddingLeft: item.isSub ? 16 : 0,
                borderBottomWidth: 0.5,
                borderBottomColor: "#f1f5f9",
              }}
            >
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: item.isSub ? "#0ea5e9" : "#0f172a",
                  marginRight: 8,
                }}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: item.isSub ? 8.5 : 9.5,
                    fontFamily: item.isSub ? "Helvetica" : "Helvetica-Bold",
                    color: item.isSub ? "#334155" : "#0f172a",
                  }}
                >
                  {item.title}
                </Text>
                {item.subtitle ? (
                  <Text
                    style={{
                      fontSize: 7,
                      fontFamily: "Helvetica",
                      color: "#64748b",
                      marginTop: 1,
                    }}
                  >
                    {item.subtitle}
                  </Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>

        {/* Right Column */}
        <View style={{ width: (CONTENT_WIDTH - 24) / 2 }}>
          {rightCol.map((item, idx) => (
            <View
              key={idx}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 5,
                paddingLeft: item.isSub ? 16 : 0,
                borderBottomWidth: 0.5,
                borderBottomColor: "#f1f5f9",
              }}
            >
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: item.isSub ? "#0ea5e9" : "#0f172a",
                  marginRight: 8,
                }}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: item.isSub ? 8.5 : 9.5,
                    fontFamily: item.isSub ? "Helvetica" : "Helvetica-Bold",
                    color: item.isSub ? "#334155" : "#0f172a",
                  }}
                >
                  {item.title}
                </Text>
                {item.subtitle ? (
                  <Text
                    style={{
                      fontSize: 7,
                      fontFamily: "Helvetica",
                      color: "#64748b",
                      marginTop: 1,
                    }}
                  >
                    {item.subtitle}
                  </Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      </View>

      <PageFooter />
    </Page>
  );
}
