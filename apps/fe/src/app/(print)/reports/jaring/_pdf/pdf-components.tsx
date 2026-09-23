import type React from "react";

import { Page, Text, View } from "@react-pdf/renderer";

import { formatNumber, PDF_COLORS, styles } from "./pdf-styles";

export function PdfPage({
  children,
  pageNumber,
  showHeader = true,
  periodLabel,
}: {
  children: React.ReactNode;
  pageNumber?: number;
  showHeader?: boolean;
  periodLabel?: string;
}) {
  return (
    <Page size="A4" orientation="portrait" style={styles.page}>
      {showHeader ? (
        <View style={styles.header}>
          <View style={styles.headerTitleContainer}>
            <View style={styles.headerBadgeDot} />
            <Text style={styles.headerTitle}>Rekap Aktivitas dan Produktivitas Jaring</Text>
          </View>
          {periodLabel ? <Text style={styles.headerPeriod}>Periode: {periodLabel}</Text> : null}
        </View>
      ) : (
        <View />
      )}

      <View style={styles.content}>{children}</View>

      {pageNumber ? (
        <View style={styles.footer}>
          <Text>Sumber Data: Sistem Operasional Terpadu</Text>
          <Text style={styles.footerPageText}>Halaman {pageNumber} dari 13</Text>
        </View>
      ) : (
        <View />
      )}
    </Page>
  );
}

export function PdfKpiCard({
  title,
  value,
  subtitle,
  accent = "dark",
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  accent?: "dark" | "cyan" | "green" | "blue" | "orange";
}) {
  const accentColor = {
    dark: PDF_COLORS.primary,
    cyan: PDF_COLORS.cyan,
    green: PDF_COLORS.green,
    blue: PDF_COLORS.blue,
    orange: PDF_COLORS.orange,
  }[accent];

  return (
    <View style={styles.kpiCard}>
      <View style={[styles.kpiTopBar, { backgroundColor: accentColor }]} />
      <Text style={styles.kpiTitle}>{title}</Text>
      <Text style={[styles.kpiValue, { color: accentColor }]}>
        {typeof value === "number" ? formatNumber(value) : value}
      </Text>
      {subtitle ? <Text style={styles.kpiSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function PdfProgressBar({ percent, color = PDF_COLORS.green }: { percent: number; color?: string }) {
  const clamped = Math.min(100, Math.max(3, percent));
  return (
    <View style={styles.barTrack}>
      <View style={[styles.barFill, { width: `${clamped}%`, backgroundColor: color }]} />
    </View>
  );
}
