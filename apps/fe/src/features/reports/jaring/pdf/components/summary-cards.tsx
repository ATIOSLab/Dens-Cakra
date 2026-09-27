import React from "react";

import { Text, View } from "@react-pdf/renderer";

import type { JaringReportData } from "../../types/jaring-report.types";
import { reportStyles } from "../report-styles";

interface SummaryCardsProps {
  summary: JaringReportData["summary"];
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  return (
    <View style={reportStyles.cardsRow}>
      {/* Card 1: Total */}
      <View style={[reportStyles.card, reportStyles.cardBlue]}>
        <Text style={[reportStyles.cardLabel, { color: "#0369a1" }]}>TOTAL JARING TERVERIFIKASI</Text>
        <View style={reportStyles.cardValueRow}>
          <Text style={[reportStyles.cardValue, { color: "#0c4a6e" }]}>
            {`${summary.total.toLocaleString("id-ID")} Orang`}
          </Text>
          <Text style={[reportStyles.cardSubtext, { color: "#0284c7" }]}>100% Tercatat Dalam Sistem</Text>
        </View>
      </View>

      {/* Card 2: Aktif */}
      <View style={[reportStyles.card, reportStyles.cardGreen]}>
        <Text style={[reportStyles.cardLabel, { color: "#15803d" }]}>STATUS JARING AKTIF</Text>
        <View style={reportStyles.cardValueRow}>
          <Text style={[reportStyles.cardValue, { color: "#14532d" }]}>
            {`${summary.active.toLocaleString("id-ID")} Orang`}
          </Text>
          <Text style={[reportStyles.cardSubtext, { color: "#16a34a" }]}>
            {`${summary.activePercentage}% Siap Operasional`}
          </Text>
        </View>
      </View>

      {/* Card 3: Tidak Aktif */}
      <View style={[reportStyles.card, reportStyles.cardYellow]}>
        <Text style={[reportStyles.cardLabel, { color: "#a16207" }]}>STATUS TIDAK AKTIF / PASIF</Text>
        <View style={reportStyles.cardValueRow}>
          <Text style={[reportStyles.cardValue, { color: "#713f12" }]}>
            {`${summary.inactive.toLocaleString("id-ID")} Orang`}
          </Text>
          <Text style={[reportStyles.cardSubtext, { color: "#ca8a04" }]}>
            {`${summary.inactivePercentage}% Evaluasi Wilayah`}
          </Text>
        </View>
      </View>
    </View>
  );
}
