import React from "react";

import { Text } from "@react-pdf/renderer";

import { reportStyles } from "../report-styles";

export function PageFooter() {
  return (
    <Text
      fixed
      style={reportStyles.pageNumber}
      render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
    />
  );
}
