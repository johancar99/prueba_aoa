import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export interface ExportColumn {
  header: string;
  dataKey: string;
}

type ExportRow = Record<string, string | number | boolean | null | undefined>;

export function exportToPDF(
  title: string,
  columns: ExportColumn[],
  rows: ExportRow[],
  filename: string,
): void {
  const doc = new jsPDF({ orientation: 'landscape' });

  doc.setFontSize(16);
  doc.setTextColor(30, 64, 175);
  doc.text('AOA — Sistema de Inventario', 14, 14);

  doc.setFontSize(12);
  doc.setTextColor(30, 30, 30);
  doc.text(title, 14, 22);

  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(`Generado el ${new Date().toLocaleString('es-CO')}`, 14, 29);

  autoTable(doc, {
    startY: 34,
    head: [columns.map((c) => c.header)],
    body: rows.map((row) => columns.map((c) => String(row[c.dataKey] ?? ''))),
    styles: { fontSize: 8, cellPadding: { top: 3, right: 4, bottom: 3, left: 4 } },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 0: { fontStyle: 'bold' } },
  });

  doc.save(`${filename}.pdf`);
}

export function exportToExcel(
  sheetName: string,
  columns: ExportColumn[],
  rows: ExportRow[],
  filename: string,
): void {
  const headers = columns.map((c) => c.header);
  const data = rows.map((row) => columns.map((c) => row[c.dataKey] ?? ''));

  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);

  // Auto-width columns
  const colWidths = columns.map((c, i) => ({
    wch: Math.max(c.header.length, ...data.map((r) => String(r[i] ?? '').length), 10),
  }));
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
