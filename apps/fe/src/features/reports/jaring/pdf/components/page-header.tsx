import React from "react";

import { Text, View } from "@react-pdf/renderer";

import { reportStyles } from "../report-styles";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
}

export function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <View style={reportStyles.headerContainer}>
      <Text style={reportStyles.headerTitle}>{title}</Text>
      {subtitle ? <Text style={reportStyles.headerSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}
