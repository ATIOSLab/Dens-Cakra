import React from 'react';
import { Page, View, Text } from '@react-pdf/renderer';
import { reportStyles } from '../report-styles';
import { PageFooter } from '../components/page-footer';
import type { JaringReportData } from '../../types/jaring-report.types';

export type TocEntry = {
  label: string;
  page: number;
  isSubItem: boolean;
};

export function computeTocEntries(data: JaringReportData): TocEntry[] {
  let currentPage = 1;
  const hasCover = data.meta.options.includeCover !== false;
  const hasMap = data.meta.options.includeMap !== false && data.items.length > 0;
  const hasInfographic = data.meta.options.includeInfographic !== false && data.items.length > 0;
  const hasToc = data.meta.options.includeToc !== false && data.items.length > 0;
  const hasRecap = data.meta.options.includeRecap !== false && data.items.length > 0;

  if (hasCover) {
    currentPage += 1;
  }

  const entries: TocEntry[] = [];

  if (hasMap) {
    entries.push({
      label: 'Peta Sebaran Jaring Intelijen DKI Jakarta',
      page: currentPage,
      isSubItem: false,
    });
    currentPage += 1;
  }

  if (hasInfographic) {
    entries.push({
      label: 'Infografis & Visualisasi Analitik Jaring',
      page: currentPage,
      isSubItem: false,
    });
    currentPage += 2; // Infografis takes 2 pages
  }

  if (hasToc) {
    currentPage += 1;
  }

  if (hasRecap) {
    // 1. Rekapitulasi Persebaran Wilayah Jaring
    const recapTerritoryPage = currentPage;
    let territoryRows = 1; // total row
    for (const prov of data.groups) {
      if (data.groups.length > 1) territoryRows += 1;
      for (const city of prov.cities) {
        territoryRows += 1;
        for (const dist of city.districts) {
          territoryRows += 1;
          territoryRows += dist.villages.length;
        }
      }
    }
    const territoryPages = Math.max(1, Math.ceil(territoryRows / 22));
    currentPage += territoryPages;

    // 2. Rekapitulasi Klasifikasi Pekerjaan Jaring
    const recapOccupationPage = currentPage;
    let occRows = 1; // total row
    for (const prov of data.groups) {
      for (const city of prov.cities) {
        occRows += Math.max(1, city.occupations.length);
      }
    }
    const occPages = Math.max(1, Math.ceil(occRows / 22));
    currentPage += occPages;

    entries.push({
      label: 'Rekapitulasi Persebaran Wilayah Jaring',
      page: recapTerritoryPage,
      isSubItem: false,
    });

    entries.push({
      label: 'Rekapitulasi Klasifikasi Pekerjaan Jaring',
      page: recapOccupationPage,
      isSubItem: false,
    });
  }

  // Profiling per Province & City
  for (const prov of data.groups) {
    const provStartPage = currentPage;
    entries.push({
      label: `${prov.provinceName} (${prov.totalJaring.toLocaleString('id-ID')} Jaring)`,
      page: provStartPage,
      isSubItem: false,
    });

    for (const city of prov.cities) {
      const cityStartPage = currentPage;
      entries.push({
        label: `• ${city.cityName} (${city.totalJaring.toLocaleString('id-ID')} Jaring)`,
        page: cityStartPage,
        isSubItem: true,
      });

      const cityPages = Math.ceil(city.items.length / 2);
      currentPage += cityPages;
    }
  }

  return entries;
}

interface TocPageProps {
  data: JaringReportData;
}

export function TocPage({ data }: TocPageProps) {
  const entries = computeTocEntries(data);
  const isSingleColumn = entries.length <= 16;

  const renderItem = (item: TocEntry, idx: number, singleCol: boolean) => {
    const isSub = item.isSubItem;
    const mainFontSize = singleCol ? 13 : 11;
    const subFontSize = singleCol ? 11.5 : 9.5;
    const dotFontSize = singleCol ? 10 : 8.5;
    const mb = singleCol ? (isSub ? 8 : 13) : isSub ? 5 : 8;
    const pl = isSub ? (singleCol ? 18 : 12) : 0;

    return (
      <View
        key={idx}
        style={{
          flexDirection: 'row',
          alignItems: 'baseline',
          marginBottom: mb,
          paddingLeft: pl,
        }}
      >
        {/* Left Label */}
        <Text
          style={{
            fontSize: isSub ? subFontSize : mainFontSize,
            fontFamily: isSub ? 'Helvetica' : 'Helvetica-Bold',
            color: isSub ? '#334155' : '#0f172a',
          }}
        >
          {item.label}
        </Text>

        {/* Dotted Leader Line */}
        <View
          style={{
            flex: 1,
            overflow: 'hidden',
            marginHorizontal: 8,
            height: singleCol ? 14 : 10,
          }}
        >
          <Text
            style={{
              color: '#cbd5e1',
              fontSize: dotFontSize,
              letterSpacing: 2.5,
              fontFamily: 'Helvetica',
            }}
          >
            ............................................................................................................................................................................................................
          </Text>
        </View>

        {/* Right Page Number */}
        <Text
          style={{
            fontSize: isSub ? subFontSize : mainFontSize,
            fontFamily: isSub ? 'Helvetica' : 'Helvetica-Bold',
            color: isSub ? '#475569' : '#0f172a',
          }}
        >
          {`Hal ${item.page}`}
        </Text>
      </View>
    );
  };

  const itemsPerCol = isSingleColumn ? entries.length : Math.ceil(entries.length / 2);
  const colLeft = entries.slice(0, itemsPerCol);
  const colRight = isSingleColumn ? [] : entries.slice(itemsPerCol);

  return (
    <Page size="A4" orientation="landscape" style={reportStyles.page}>
      {/* Centered Header */}
      <View style={{ alignItems: 'center', marginTop: 14 }}>
        <Text
          style={{
            fontSize: 24,
            fontFamily: 'Helvetica-Bold',
            color: '#0f172a',
            letterSpacing: 1.5,
          }}
        >
          DAFTAR ISI
        </Text>
        <Text
          style={{
            fontSize: 12.5,
            fontFamily: 'Helvetica',
            color: '#0284c7',
            marginTop: 6,
          }}
        >
          Rekapitulasi dan Pembagian Wilayah Jaring Kelurahan
        </Text>
        <View
          style={{
            width: isSingleColumn ? 600 : 720,
            height: 1.5,
            backgroundColor: '#e2e8f0',
            marginTop: 16,
            marginBottom: 24,
          }}
        />
      </View>

      {/* Table of Contents List */}
      {isSingleColumn ? (
        <View style={{ width: 600, alignSelf: 'center' }}>
          {entries.map((item, idx) => renderItem(item, idx, true))}
        </View>
      ) : (
        <View
          style={{
            width: 720,
            alignSelf: 'center',
            flexDirection: 'row',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ width: 345 }}>
            {colLeft.map((item, idx) => renderItem(item, idx, false))}
          </View>
          <View style={{ width: 345 }}>
            {colRight.map((item, idx) => renderItem(item, idx, false))}
          </View>
        </View>
      )}

      <PageFooter />
    </Page>
  );
}
