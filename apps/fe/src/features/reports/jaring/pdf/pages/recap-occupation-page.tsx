import React from 'react';
import { Page, View, Text } from '@react-pdf/renderer';
import { reportStyles, CONTENT_WIDTH } from '../report-styles';
import { PageHeader } from '../components/page-header';
import { PageFooter } from '../components/page-footer';
import type { JaringReportData } from '../../types/jaring-report.types';

interface RecapOccupationPageProps {
  data: JaringReportData;
}

export function RecapOccupationPage({ data }: RecapOccupationPageProps) {
  const colWidths = [35, 140, 185, 279, 130]; // Total = 769 pt

  let globalNo = 1;

  return (
    <Page size="A4" orientation="landscape" style={reportStyles.page}>
      <PageHeader
        title="REKAPITULASI KLASIFIKASI PEKERJAAN JARING"
        subtitle="Distribusi klasifikasi profesi jaring intelijen berdasarkan unit wilayah administratif."
      />

      <View
        style={{
          width: CONTENT_WIDTH,
          borderWidth: 0.5,
          borderColor: '#94a3b8',
          marginTop: 6,
        }}
      >
        {/* Table Header */}
        <View
          fixed
          style={{
            flexDirection: 'row',
            backgroundColor: '#e2e8f0',
            height: 24,
            alignItems: 'center',
            borderBottomWidth: 0.75,
            borderBottomColor: '#94a3b8',
          }}
        >
          <Text
            style={{
              width: colWidths[0],
              fontSize: 8.5,
              fontFamily: 'Helvetica-Bold',
              color: '#0f172a',
              textAlign: 'center',
            }}
          >
            NO.
          </Text>
          <Text
            style={{
              width: colWidths[1],
              fontSize: 8.5,
              fontFamily: 'Helvetica-Bold',
              color: '#0f172a',
              paddingLeft: 6,
            }}
          >
            PROVINSI
          </Text>
          <Text
            style={{
              width: colWidths[2],
              fontSize: 8.5,
              fontFamily: 'Helvetica-Bold',
              color: '#0f172a',
              paddingLeft: 6,
            }}
          >
            KOTA / KABUPATEN
          </Text>
          <Text
            style={{
              width: colWidths[3],
              fontSize: 8.5,
              fontFamily: 'Helvetica-Bold',
              color: '#0f172a',
              paddingLeft: 6,
            }}
          >
            PEKERJAAN
          </Text>
          <Text
            style={{
              width: colWidths[4],
              fontSize: 8.5,
              fontFamily: 'Helvetica-Bold',
              color: '#0f172a',
              textAlign: 'center',
            }}
          >
            JUMLAH JARING
          </Text>
        </View>

        {/* Rows grouped by Province & City */}
        {data.groups.map((prov, pIdx) =>
          prov.cities.map((city, cIdx) => {
            const occList =
              city.occupations.length > 0
                ? city.occupations
                : [{ name: 'Belum Terklasifikasi', count: city.totalJaring }];
            const rowNumber = globalNo++;

            return (
              <React.Fragment key={`${pIdx}-${cIdx}`}>
                {occList.map((occ, oIdx) => {
                  const isFirstOcc = oIdx === 0;
                  const isZebra = oIdx % 2 === 1;

                  return (
                    <View
                      key={oIdx}
                      wrap={false}
                      style={{
                        flexDirection: 'row',
                        minHeight: 19,
                        alignItems: 'center',
                        backgroundColor: isZebra ? '#f8fafc' : '#ffffff',
                        borderBottomWidth: 0.5,
                        borderBottomColor: '#e2e8f0',
                      }}
                    >
                      {/* NO */}
                      <Text
                        style={{
                          width: colWidths[0],
                          fontSize: 8,
                          fontFamily: 'Helvetica',
                          color: '#475569',
                          textAlign: 'center',
                        }}
                      >
                        {isFirstOcc ? `${rowNumber}.` : ''}
                      </Text>

                      {/* PROVINSI */}
                      <Text
                        style={{
                          width: colWidths[1],
                          fontSize: 8,
                          fontFamily: isFirstOcc ? 'Helvetica-Bold' : 'Helvetica',
                          color: '#1e293b',
                          paddingLeft: 6,
                        }}
                      >
                        {isFirstOcc ? prov.provinceName : ''}
                      </Text>

                      {/* KOTA / KABUPATEN */}
                      <Text
                        style={{
                          width: colWidths[2],
                          fontSize: 8,
                          fontFamily: isFirstOcc ? 'Helvetica-Bold' : 'Helvetica',
                          color: '#0369a1',
                          paddingLeft: 6,
                        }}
                      >
                        {isFirstOcc ? city.cityName : ''}
                      </Text>

                      {/* PEKERJAAN */}
                      <Text
                        style={{
                          width: colWidths[3],
                          fontSize: 8,
                          fontFamily: 'Helvetica',
                          color: '#334155',
                          paddingLeft: 6,
                        }}
                      >
                        {occ.name}
                      </Text>

                      {/* JUMLAH JARING */}
                      <Text
                        style={{
                          width: colWidths[4],
                          fontSize: 8,
                          fontFamily: 'Helvetica-Bold',
                          color: '#0f172a',
                          textAlign: 'center',
                        }}
                      >
                        {`${occ.count.toLocaleString('id-ID')} Orang`}
                      </Text>
                    </View>
                  );
                })}
              </React.Fragment>
            );
          }),
        )}

        {/* Total Row */}
        <View
          wrap={false}
          style={{
            flexDirection: 'row',
            backgroundColor: '#0f172a',
            height: 22,
            alignItems: 'center',
          }}
        >
          <Text style={{ width: colWidths[0] }} />
          <Text style={{ width: colWidths[1] }} />
          <Text
            style={{
              width: colWidths[2] + colWidths[3],
              fontSize: 8.5,
              fontFamily: 'Helvetica-Bold',
              color: '#ffffff',
              paddingLeft: 6,
            }}
          >
            TOTAL KESELURUHAN JARING
          </Text>
          <Text
            style={{
              width: colWidths[4],
              fontSize: 8.5,
              fontFamily: 'Helvetica-Bold',
              color: '#ffffff',
              textAlign: 'center',
            }}
          >
            {`${data.summary.total.toLocaleString('id-ID')} Orang`}
          </Text>
        </View>
      </View>

      <PageFooter />
    </Page>
  );
}
