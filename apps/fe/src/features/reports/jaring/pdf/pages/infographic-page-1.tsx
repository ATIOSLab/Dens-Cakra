import React from "react";

import { Page, Text, View } from "@react-pdf/renderer";

import type { JaringReportData } from "../../types/jaring-report.types";
import { DonutChart } from "../../visualizations/donut-chart";
import { PageFooter } from "../components/page-footer";
import { PageHeader } from "../components/page-header";
import { SummaryCards } from "../components/summary-cards";
import { reportStyles } from "../report-styles";

interface InfographicPage1Props {
  data: JaringReportData;
}

export function InfographicPage1({ data }: InfographicPage1Props) {
  const maxCityCount = Math.max(1, ...data.wilayah.citiesRanked.map((c) => c.totalJaring));

  const statusSlices = [
    {
      label: "Aktif (Siap Ops)",
      count: data.summary.active,
      percentage: data.summary.activePercentage,
      color: "#16a34a",
    },
    {
      label: "Tidak Aktif (Pasif)",
      count: data.summary.inactive,
      percentage: data.summary.inactivePercentage,
      color: "#ca8a04",
    },
  ];

  const genderSlices = data.gender.items.map((g) => ({
    label: g.label,
    count: g.count,
    percentage: g.percentage,
    color: g.label.toUpperCase() === "PRIA" || g.label.toUpperCase() === "LAKI-LAKI" ? "#0284c7" : "#ec4899",
  }));

  return (
    <Page size="A4" orientation="landscape" style={reportStyles.page}>
      <PageHeader
        title="INFOGRAFIS DATA JARING: SEBARAN WILAYAH & STATUS OPERASIONAL"
        subtitle="Ringkasan eksekutif persebaran wilayah, kesiapan operasional, dan komposisi demografi jaring."
      />

      <SummaryCards summary={data.summary} />

      {/* Main Grid: 2 Columns */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: 4,
        }}
      >
        {/* Left Column: Ranked Cities Horizontal Bars */}
        <View style={{ width: 410 }}>
          <Text
            style={{
              fontSize: 9.5,
              fontFamily: "Helvetica-Bold",
              color: "#0f172a",
            }}
          >
            A. SEBARAN JARING PER KOTA / KABUPATEN
          </Text>
          <Text
            style={{
              fontSize: 7.5,
              fontFamily: "Helvetica",
              color: "#64748b",
              marginTop: 2,
              marginBottom: 8,
            }}
          >
            Perbandingan jumlah jaring antar wilayah administratif (terbesar ke terkecil)
          </Text>

          <View
            style={{
              width: 410,
              height: 350,
              backgroundColor: "#f8fafc",
              borderWidth: 0.75,
              borderColor: "#e2e8f0",
              borderRadius: 6,
              padding: 12,
              justifyContent: "space-around",
            }}
          >
            {data.wilayah.citiesRanked.map((city, idx) => {
              const barWidth = maxCityCount > 0 ? Math.max(8, (city.totalJaring / maxCityCount) * 230) : 8;

              return (
                <View key={idx} style={{ marginBottom: 6 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginBottom: 3,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 8,
                        fontFamily: "Helvetica-Bold",
                        color: "#1e293b",
                      }}
                    >
                      {city.cityName}
                    </Text>
                    <Text
                      style={{
                        fontSize: 8,
                        fontFamily: "Helvetica-Bold",
                        color: "#0284c7",
                      }}
                    >
                      {`${city.totalJaring.toLocaleString("id-ID")} Orang (${city.percentage}%)`}
                    </Text>
                  </View>
                  <View
                    style={{
                      width: "100%",
                      height: 12,
                      backgroundColor: "#e2e8f0",
                      borderRadius: 3,
                      overflow: "hidden",
                    }}
                  >
                    <View
                      style={{
                        width: barWidth,
                        height: 12,
                        backgroundColor: "#0284c7",
                        borderRadius: 3,
                      }}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Right Column: Status & Gender Donut Charts */}
        <View style={{ width: 345 }}>
          {/* Section B */}
          <View style={{ marginBottom: 12 }}>
            <Text
              style={{
                fontSize: 9.5,
                fontFamily: "Helvetica-Bold",
                color: "#0f172a",
              }}
            >
              B. STATUS KESIAPAN OPERASIONAL
            </Text>
            <Text
              style={{
                fontSize: 7.5,
                fontFamily: "Helvetica",
                color: "#64748b",
                marginTop: 2,
                marginBottom: 6,
              }}
            >
              Berdasarkan rekam aktivitas pelaporan intelijen 90 hari terakhir
            </Text>
            <DonutChart
              totalValue={data.summary.total}
              slices={statusSlices}
              centerLabel="TOTAL"
              width={345}
              height={145}
            />
          </View>

          {/* Section C */}
          <View>
            <Text
              style={{
                fontSize: 9.5,
                fontFamily: "Helvetica-Bold",
                color: "#0f172a",
              }}
            >
              C. KOMPOSISI JENIS KELAMIN
            </Text>
            <Text
              style={{
                fontSize: 7.5,
                fontFamily: "Helvetica",
                color: "#64748b",
                marginTop: 2,
                marginBottom: 6,
              }}
            >
              Perbandingan proporsi jaring pria dan wanita
            </Text>
            <DonutChart
              totalValue={data.summary.total}
              slices={genderSlices}
              centerLabel="TOTAL"
              width={345}
              height={145}
            />
          </View>
        </View>
      </View>

      <PageFooter />
    </Page>
  );
}
