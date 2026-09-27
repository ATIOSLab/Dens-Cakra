import React from "react";

import { Image, Page, Text, View } from "@react-pdf/renderer";

import type { CityGroup, FormattedJaring, JaringReportData } from "../../types/jaring-report.types";
import { PageFooter } from "../components/page-footer";
import { CONTENT_WIDTH, reportStyles } from "../report-styles";

interface ProfilingPagesProps {
  data: JaringReportData;
}

export function ProfilingPages({ data }: ProfilingPagesProps) {
  // Flatten cities with their starting global index
  let globalIndex = 1;
  const cityEntries: Array<{
    city: CityGroup;
    provinceName: string;
    startIndex: number;
  }> = [];

  for (const prov of data.groups) {
    for (const city of prov.cities) {
      cityEntries.push({
        city,
        provinceName: prov.provinceName,
        startIndex: globalIndex,
      });
      globalIndex += city.items.length;
    }
  }

  // Chunk array helper
  function chunkArray<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  }

  const colWidths = [40, 150, 430, 149];
  const colHeaders = ["NO", "NAMA (KODE JARING)", "IDENTITAS", "FOTO"];

  return (
    <>
      {cityEntries.map(({ city, startIndex }, cIdx) => {
        const itemChunks = chunkArray(city.items, 2);
        let currentItemIndex = startIndex;

        return itemChunks.map((chunk, pageInCity) => {
          const isContinued = pageInCity > 0;
          const chunkStartIndex = currentItemIndex;
          currentItemIndex += chunk.length;

          return (
            <Page key={`city-${cIdx}-p-${pageInCity}`} size="A4" orientation="landscape" style={reportStyles.page}>
              {/* City Title Banner */}
              <View
                style={{
                  width: CONTENT_WIDTH,
                  backgroundColor: "#0f172a",
                  height: 22,
                  justifyContent: "center",
                  paddingHorizontal: 8,
                }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontFamily: "Helvetica-Bold",
                    color: "#ffffff",
                  }}
                >
                  {`${city.cityName.toUpperCase()}${isContinued ? " (LANJUTAN)" : ""}`}
                </Text>
              </View>

              {/* Table Column Header Banner */}
              <View
                style={{
                  width: CONTENT_WIDTH,
                  backgroundColor: "#f1f5f9",
                  height: 22,
                  flexDirection: "row",
                  alignItems: "center",
                  borderWidth: 0.5,
                  borderColor: "#94a3b8",
                  marginBottom: 6,
                }}
              >
                {colHeaders.map((head, hIdx) => {
                  const isCenter = hIdx === 0 || hIdx === 3;
                  return (
                    <View
                      key={hIdx}
                      style={{
                        width: colWidths[hIdx],
                        borderRightWidth: hIdx < 3 ? 0.5 : 0,
                        borderRightColor: "#94a3b8",
                        paddingHorizontal: 4,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 8.5,
                          fontFamily: "Helvetica-Bold",
                          color: "#0f172a",
                          textAlign: isCenter ? "center" : "left",
                        }}
                      >
                        {head}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {/* Profiling Dossier Cards (Max 2 per page) */}
              {chunk.map((item: FormattedJaring, itemIdx: number) => {
                const itemNo = chunkStartIndex + itemIdx;
                const isZebra = itemNo % 2 === 0;
                const displayName = item.fullName || item.aliasName || "-";
                const jaringCode = item.aliasName || "-";

                return (
                  <View
                    key={item.id || itemIdx}
                    wrap={false}
                    style={[reportStyles.profilingCard, isZebra ? reportStyles.profilingCardZebra : {}]}
                  >
                    {/* Col 1: NO */}
                    <View style={reportStyles.profilingColNo}>
                      <Text
                        style={{
                          fontSize: 11,
                          fontFamily: "Helvetica-Bold",
                          color: "#0f172a",
                        }}
                      >
                        {String(itemNo)}
                      </Text>
                    </View>

                    {/* Col 2: NAMA (KODE JARING) */}
                    <View style={reportStyles.profilingColIdentity}>
                      <Text
                        style={{
                          fontSize: 10.5,
                          fontFamily: "Helvetica-Bold",
                          color: "#0f172a",
                        }}
                      >
                        {displayName}
                      </Text>
                      {jaringCode && jaringCode !== "-" && jaringCode !== displayName ? (
                        <Text
                          style={{
                            fontSize: 9,
                            fontFamily: "Helvetica",
                            color: "#475569",
                            marginTop: 4,
                          }}
                        >
                          {`Kode: ${jaringCode}`}
                        </Text>
                      ) : null}
                    </View>

                    {/* Col 3: IDENTITAS */}
                    <View style={reportStyles.profilingColDetails}>
                      {(item.profilingRows || []).map((row, rIdx) => (
                        <View
                          key={rIdx}
                          style={{
                            flexDirection: "row",
                            marginBottom: 3.5,
                          }}
                        >
                          <Text
                            style={{
                              width: 90,
                              fontSize: 9,
                              fontFamily: "Helvetica-Bold",
                              color: "#334155",
                            }}
                          >
                            {`- ${row.label}`}
                          </Text>
                          <Text
                            style={{
                              flex: 1,
                              fontSize: 9,
                              fontFamily: "Helvetica",
                              color: "#0f172a",
                            }}
                          >
                            {`: ${row.val}`}
                          </Text>
                        </View>
                      ))}
                    </View>

                    {/* Col 4: FOTO */}
                    <View style={reportStyles.profilingColPhoto}>
                      <View style={reportStyles.photoBox}>
                        {item.profilePhotoBase64 ? (
                          <Image src={item.profilePhotoBase64} style={reportStyles.photoImage} />
                        ) : (
                          <View
                            style={{
                              alignItems: "center",
                              justifyContent: "center",
                              padding: 8,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 7.5,
                                fontFamily: "Helvetica",
                                color: "#94a3b8",
                                textAlign: "center",
                              }}
                            >
                              FOTO TIDAK TERSEDIA
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}

              <PageFooter />
            </Page>
          );
        });
      })}
    </>
  );
}
