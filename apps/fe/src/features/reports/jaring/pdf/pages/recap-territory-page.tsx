import React from "react";

import { Page, Text, View } from "@react-pdf/renderer";

import type { JaringReportData } from "../../types/jaring-report.types";
import { PageFooter } from "../components/page-footer";
import { PageHeader } from "../components/page-header";
import { CONTENT_WIDTH, reportStyles } from "../report-styles";

interface RecapTerritoryPageProps {
  data: JaringReportData;
}

export function RecapTerritoryPage({ data }: RecapTerritoryPageProps) {
  const colW1 = 609;
  const colW2 = 160;

  return (
    <Page size="A4" orientation="landscape" style={reportStyles.page}>
      <PageHeader
        title="REKAPITULASI PERSEBARAN WILAYAH JARING"
        subtitle="Penyajian data hierarkis berjenjang: Kota / Kabupaten Administrasi → Kecamatan → Kelurahan"
      />

      {/* Table Container */}
      <View
        style={{
          width: CONTENT_WIDTH,
          borderWidth: 0.5,
          borderColor: "#94a3b8",
          marginTop: 6,
        }}
      >
        {/* Table Header */}
        <View
          fixed
          style={{
            flexDirection: "row",
            backgroundColor: "#0f172a",
            height: 22,
            alignItems: "center",
            paddingHorizontal: 8,
          }}
        >
          <Text
            style={{
              width: colW1,
              fontSize: 8.5,
              fontFamily: "Helvetica-Bold",
              color: "#ffffff",
            }}
          >
            WILAYAH OPERASIONAL / TINGKAT ADMINISTRASI
          </Text>
          <Text
            style={{
              width: colW2,
              fontSize: 8.5,
              fontFamily: "Helvetica-Bold",
              color: "#ffffff",
              textAlign: "center",
            }}
          >
            JUMLAH JARING
          </Text>
        </View>

        {/* Hierarchy Rows */}
        {data.groups.map((province, pIdx) => (
          <React.Fragment key={pIdx}>
            {/* Province Row (if more than 1 province or explicit) */}
            {data.groups.length > 1 ? (
              <View
                wrap={false}
                style={{
                  flexDirection: "row",
                  backgroundColor: "#e2e8f0",
                  height: 20,
                  alignItems: "center",
                  paddingHorizontal: 8,
                  borderBottomWidth: 0.5,
                  borderBottomColor: "#cbd5e1",
                }}
              >
                <Text
                  style={{
                    width: colW1,
                    fontSize: 8.5,
                    fontFamily: "Helvetica-Bold",
                    color: "#0f172a",
                  }}
                >
                  {province.provinceName.toUpperCase()}
                </Text>
                <Text
                  style={{
                    width: colW2,
                    fontSize: 8.5,
                    fontFamily: "Helvetica-Bold",
                    color: "#0f172a",
                    textAlign: "center",
                  }}
                >
                  {`${province.totalJaring.toLocaleString("id-ID")} Orang`}
                </Text>
              </View>
            ) : null}

            {/* City Rows */}
            {province.cities.map((city, cIdx) => (
              <React.Fragment key={cIdx}>
                <View
                  wrap={false}
                  style={{
                    flexDirection: "row",
                    backgroundColor: "#f1f5f9",
                    minHeight: 20,
                    alignItems: "center",
                    paddingHorizontal: 8,
                    borderBottomWidth: 0.5,
                    borderBottomColor: "#cbd5e1",
                  }}
                >
                  <Text
                    style={{
                      width: colW1,
                      fontSize: 8.5,
                      fontFamily: "Helvetica-Bold",
                      color: "#0369a1",
                      paddingLeft: data.groups.length > 1 ? 12 : 4,
                    }}
                  >
                    {city.cityName.toUpperCase()}
                  </Text>
                  <Text
                    style={{
                      width: colW2,
                      fontSize: 8.5,
                      fontFamily: "Helvetica-Bold",
                      color: "#0369a1",
                      textAlign: "center",
                    }}
                  >
                    {`${city.totalJaring.toLocaleString("id-ID")} Orang`}
                  </Text>
                </View>

                {/* District Rows */}
                {city.districts.map((district, dIdx) => (
                  <React.Fragment key={dIdx}>
                    <View
                      wrap={false}
                      style={{
                        flexDirection: "row",
                        backgroundColor: "#ffffff",
                        minHeight: 18,
                        alignItems: "center",
                        paddingHorizontal: 8,
                        borderBottomWidth: 0.5,
                        borderBottomColor: "#e2e8f0",
                      }}
                    >
                      <Text
                        style={{
                          width: colW1,
                          fontSize: 8,
                          fontFamily: "Helvetica-Bold",
                          color: "#334155",
                          paddingLeft: 24,
                        }}
                      >
                        {`• Kec. ${district.districtName}`}
                      </Text>
                      <Text
                        style={{
                          width: colW2,
                          fontSize: 8,
                          fontFamily: "Helvetica-Bold",
                          color: "#334155",
                          textAlign: "center",
                        }}
                      >
                        {`${district.totalJaring.toLocaleString("id-ID")} Orang`}
                      </Text>
                    </View>

                    {/* Village Rows */}
                    {district.villages.map((village, vIdx) => (
                      <View
                        key={vIdx}
                        wrap={false}
                        style={{
                          flexDirection: "row",
                          backgroundColor: vIdx % 2 === 1 ? "#f8fafc" : "#ffffff",
                          minHeight: 16,
                          alignItems: "center",
                          paddingHorizontal: 8,
                          borderBottomWidth: 0.5,
                          borderBottomColor: "#f1f5f9",
                        }}
                      >
                        <Text
                          style={{
                            width: colW1,
                            fontSize: 7.5,
                            fontFamily: "Helvetica",
                            color: "#475569",
                            paddingLeft: 44,
                          }}
                        >
                          {`- Kel. ${village.villageName}`}
                        </Text>
                        <Text
                          style={{
                            width: colW2,
                            fontSize: 7.5,
                            fontFamily: "Helvetica",
                            color: "#475569",
                            textAlign: "center",
                          }}
                        >
                          {`${village.totalJaring.toLocaleString("id-ID")} Orang`}
                        </Text>
                      </View>
                    ))}
                  </React.Fragment>
                ))}
              </React.Fragment>
            ))}
          </React.Fragment>
        ))}

        {/* Total Summary Row */}
        <View
          wrap={false}
          style={{
            flexDirection: "row",
            backgroundColor: "#0f172a",
            height: 22,
            alignItems: "center",
            paddingHorizontal: 8,
          }}
        >
          <Text
            style={{
              width: colW1,
              fontSize: 8.5,
              fontFamily: "Helvetica-Bold",
              color: "#ffffff",
            }}
          >
            TOTAL KESELURUHAN JARING
          </Text>
          <Text
            style={{
              width: colW2,
              fontSize: 8.5,
              fontFamily: "Helvetica-Bold",
              color: "#ffffff",
              textAlign: "center",
            }}
          >
            {`${data.summary.total.toLocaleString("id-ID")} Orang`}
          </Text>
        </View>
      </View>

      <PageFooter />
    </Page>
  );
}
