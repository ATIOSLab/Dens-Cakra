import React from "react";

import { Page, Text, View } from "@react-pdf/renderer";

import type { JaringReportData } from "../../types/jaring-report.types";
import { BarChart } from "../../visualizations/bar-chart";
import { WordCloud } from "../../visualizations/word-cloud";
import { PageFooter } from "../components/page-footer";
import { PageHeader } from "../components/page-header";
import { reportStyles } from "../report-styles";

interface InfographicPage2Props {
  data: JaringReportData;
}

export function InfographicPage2({ data }: InfographicPage2Props) {
  const topChartW = 376;
  const topChartH = 145;

  const occCloudW = 330;
  const occCloudH = 224;
  const legTableW = 425;

  return (
    <Page size="A4" orientation="landscape" style={reportStyles.page}>
      <PageHeader
        title="INFOGRAFIS DEMOGRAFI & KLASIFIKASI PEKERJAAN JARING"
        subtitle="Analisis komprehensif rentang usia, klasifikasi generasi, dan peta dominasi profesi jaring."
      />

      {/* Top Section: Age (Left) & Generation (Right) */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        {/* Left: Age */}
        <View style={{ width: topChartW }}>
          <Text
            style={{
              fontSize: 9.5,
              fontFamily: "Helvetica-Bold",
              color: "#0f172a",
            }}
          >
            D. KOMPOSISI BERDASARKAN RENTANG USIA
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
            Distribusi usia operasional jaring (tahun)
          </Text>
          <BarChart
            items={data.ageGroups.items.map((a) => ({
              label: a.range,
              count: a.count,
              percentage: a.percentage,
            }))}
            barColor="#0ea5e9"
            width={topChartW}
            height={topChartH}
          />
        </View>

        {/* Right: Generation */}
        <View style={{ width: topChartW }}>
          <Text
            style={{
              fontSize: 9.5,
              fontFamily: "Helvetica-Bold",
              color: "#0f172a",
            }}
          >
            E. DISTRIBUSI KELOMPOK GENERASI
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
            Klasifikasi generasi berdasarkan tahun kelahiran
          </Text>
          <BarChart
            items={data.generations.items.map((g) => ({
              label: g.name,
              count: g.count,
              percentage: g.percentage,
            }))}
            barColor="#6366f1"
            width={topChartW}
            height={topChartH}
          />
        </View>
      </View>

      {/* Bottom Section: Occupations Word Cloud & Precision Table */}
      <View>
        <Text
          style={{
            fontSize: 9.5,
            fontFamily: "Helvetica-Bold",
            color: "#0f172a",
          }}
        >
          F. KLASIFIKASI PEKERJAAN (10 KATEGORI UTAMA)
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
          Word Cloud merefleksikan dominasi visual, tabel legenda menyajikan angka presisi.
        </Text>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
          }}
        >
          {/* Word Cloud */}
          <WordCloud occupations={data.occupations.topCategories} width={occCloudW} height={occCloudH} />

          {/* Precision Table */}
          <View
            style={{
              width: legTableW,
              borderWidth: 0.5,
              borderColor: "#cbd5e1",
            }}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: "row",
                backgroundColor: "#0f172a",
                height: 20,
                alignItems: "center",
                paddingHorizontal: 4,
              }}
            >
              <Text
                style={{
                  width: 24,
                  fontSize: 7.5,
                  fontFamily: "Helvetica-Bold",
                  color: "#ffffff",
                  textAlign: "center",
                }}
              >
                NO.
              </Text>
              <Text
                style={{
                  width: 220,
                  fontSize: 7.5,
                  fontFamily: "Helvetica-Bold",
                  color: "#ffffff",
                }}
              >
                KATEGORI PEKERJAAN
              </Text>
              <Text
                style={{
                  width: 90,
                  fontSize: 7.5,
                  fontFamily: "Helvetica-Bold",
                  color: "#ffffff",
                  textAlign: "center",
                }}
              >
                JUMLAH
              </Text>
              <Text
                style={{
                  width: 75,
                  fontSize: 7.5,
                  fontFamily: "Helvetica-Bold",
                  color: "#ffffff",
                  textAlign: "center",
                }}
              >
                PERSENTASE
              </Text>
            </View>

            {/* Table Rows */}
            {data.occupations.topCategories.map((occ, idx) => {
              const isZebra = idx % 2 === 1;
              const isWiraswasta = occ.name === "Wiraswasta";
              const isLainnya = occ.name === "Lainnya";

              return (
                <View
                  key={idx}
                  style={{
                    flexDirection: "row",
                    height: 18,
                    alignItems: "center",
                    paddingHorizontal: 4,
                    backgroundColor: isZebra ? "#f8fafc" : "#ffffff",
                    borderBottomWidth: 0.5,
                    borderBottomColor: "#e2e8f0",
                  }}
                >
                  <Text
                    style={{
                      width: 24,
                      fontSize: 7.5,
                      fontFamily: "Helvetica",
                      color: isLainnya ? "#94a3b8" : "#475569",
                      textAlign: "center",
                    }}
                  >
                    {`${idx + 1}.`}
                  </Text>
                  <Text
                    style={{
                      width: 220,
                      fontSize: 7.5,
                      fontFamily: isWiraswasta ? "Helvetica-Bold" : "Helvetica",
                      color: isWiraswasta ? "#0369a1" : isLainnya ? "#64748b" : "#1e293b",
                    }}
                  >
                    {occ.name}
                  </Text>
                  <Text
                    style={{
                      width: 90,
                      fontSize: 7.5,
                      fontFamily: "Helvetica-Bold",
                      color: "#0f172a",
                      textAlign: "center",
                    }}
                  >
                    {`${occ.count.toLocaleString("id-ID")} Orang`}
                  </Text>
                  <Text
                    style={{
                      width: 75,
                      fontSize: 7.5,
                      fontFamily: "Helvetica",
                      color: "#475569",
                      textAlign: "center",
                    }}
                  >
                    {`${occ.percentage}%`}
                  </Text>
                </View>
              );
            })}

            {/* Total Row */}
            <View
              style={{
                flexDirection: "row",
                height: 20,
                alignItems: "center",
                paddingHorizontal: 4,
                backgroundColor: "#e2e8f0",
                borderTopWidth: 0.75,
                borderTopColor: "#64748b",
              }}
            >
              <Text style={{ width: 24 }} />
              <Text
                style={{
                  width: 220,
                  fontSize: 8,
                  fontFamily: "Helvetica-Bold",
                  color: "#0f172a",
                }}
              >
                TOTAL JARING
              </Text>
              <Text
                style={{
                  width: 90,
                  fontSize: 8,
                  fontFamily: "Helvetica-Bold",
                  color: "#0f172a",
                  textAlign: "center",
                }}
              >
                {`${data.summary.total.toLocaleString("id-ID")} Orang`}
              </Text>
              <Text
                style={{
                  width: 75,
                  fontSize: 8,
                  fontFamily: "Helvetica-Bold",
                  color: "#0f172a",
                  textAlign: "center",
                }}
              >
                100%
              </Text>
            </View>
          </View>
        </View>
      </View>

      <PageFooter />
    </Page>
  );
}
