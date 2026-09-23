export type ExcelExportOptions = {
  filename: string;
  sheetName?: string;
  headers: string[];
  rows: (string | number | boolean | null | undefined)[][];
  colWidths?: number[];
};

/**
 * Universal Excel (.xlsx) export utility using SheetJS.
 * Dynamically loads the library only on demand, formats column widths,
 * and triggers a safe browser download of a genuine .xlsx workbook.
 */
export async function exportToExcel({
  filename,
  sheetName = "Sheet1",
  headers,
  rows,
  colWidths,
}: ExcelExportOptions): Promise<void> {
  const XLSX = await import("xlsx");

  const cleanRows = rows.map((row) =>
    row.map((cell) => {
      if (cell === null || cell === undefined) return "-";
      return cell;
    }),
  );

  const ws = XLSX.utils.aoa_to_sheet([headers, ...cleanRows]);

  if (colWidths && colWidths.length > 0) {
    ws["!cols"] = colWidths.map((wch) => ({ wch }));
  }

  const wb = XLSX.utils.book_new();
  const safeSheetName = sheetName.replace(/[:\\/?*[\]]/g, "_").slice(0, 31);
  XLSX.utils.book_append_sheet(wb, ws, safeSheetName || "Data");

  const cleanFilename = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;

  const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = cleanFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
