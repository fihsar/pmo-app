"use client";

type ExcelValue = string | number | boolean | Date | null | undefined;
type ExcelRow = Record<string, ExcelValue>;

const MIME_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const textEncoder = new TextEncoder();

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function columnName(index: number): string {
  let name = "";
  let value = index;
  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }
  return name;
}

function cellRef(row: number, column: number): string {
  return `${columnName(column)}${row}`;
}

function sheetNameXml(name: string): string {
  return escapeXml(name.slice(0, 31) || "Sheet1");
}

function safeNumber(value: number): string | null {
  return Number.isFinite(value) ? String(value) : null;
}

function isDateHeader(header?: string): boolean {
  if (!header) return false;
  const h = header.toUpperCase();
  return h.includes("DATE") || h.endsWith("_AT") || h.includes("TANGGAL") || h.includes("WAKTU");
}

function toExcelSerialDate(value: ExcelValue): number | null {
  if (value === null || value === undefined || value === "") return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    const utcMs = Date.UTC(value.getFullYear(), value.getMonth(), value.getDate());
    return 25569 + Math.floor(utcMs / 86400000);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    // Match YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss...
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/);
    if (isoMatch) {
      const year = parseInt(isoMatch[1], 10);
      const month = parseInt(isoMatch[2], 10);
      const day = parseInt(isoMatch[3], 10);
      if (year >= 1900 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        const utcMs = Date.UTC(year, month - 1, day);
        return 25569 + Math.floor(utcMs / 86400000);
      }
    }

    // Match DD-MM-YYYY or DD/MM/YYYY
    const ddmmyyyyMatch = trimmed.match(/^(\d{2})[-/.](\d{2})[-/.](\d{4})$/);
    if (ddmmyyyyMatch) {
      const day = parseInt(ddmmyyyyMatch[1], 10);
      const month = parseInt(ddmmyyyyMatch[2], 10);
      const year = parseInt(ddmmyyyyMatch[3], 10);
      if (year >= 1900 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        const utcMs = Date.UTC(year, month - 1, day);
        return 25569 + Math.floor(utcMs / 86400000);
      }
    }
  }

  return null;
}

function cellXml(ref: string, value: ExcelValue, styleId: number, header?: string): string {
  if (value === null || value === undefined || value === "") {
    return `<c r="${ref}" s="${styleId}"/>`;
  }

  if (typeof value === "number") {
    const numericValue = safeNumber(value);
    if (numericValue !== null) return `<c r="${ref}" s="${styleId}"><v>${numericValue}</v></c>`;
  }

  if (typeof value === "boolean") {
    return `<c r="${ref}" s="${styleId}" t="b"><v>${value ? 1 : 0}</v></c>`;
  }

  if (styleId !== 1) {
    const dateHeader = isDateHeader(header);
    if (value instanceof Date || dateHeader || typeof value === "string") {
      const serialDate = toExcelSerialDate(value);
      if (serialDate !== null) {
        return `<c r="${ref}" s="3"><v>${serialDate}</v></c>`;
      }
    }
  }

  return `<c r="${ref}" s="${styleId}" t="inlineStr"><is><t>${escapeXml(String(value))}</t></is></c>`;
}

function columnWidth(header: string, rows: ExcelRow[]): number {
  const maxLength = rows.reduce((max, row) => {
    const value = row[header];
    return Math.max(max, String(value ?? "").length);
  }, header.length);
  return Math.min(Math.max(maxLength + 2, 10), 36);
}

function worksheetXml(rows: ExcelRow[]): string {
  const headers = Object.keys(rows[0] ?? {});
  const columnCount = Math.max(headers.length, 1);
  const rowCount = Math.max(rows.length + 1, 1);
  const dimension = `A1:${cellRef(rowCount, columnCount)}`;
  const cols = headers
    .map((header, index) => {
      const column = index + 1;
      return `<col min="${column}" max="${column}" width="${columnWidth(header, rows)}" customWidth="1"/>`;
    })
    .join("");

  const headerCells = headers
    .map((header, index) => cellXml(cellRef(1, index + 1), header, 1, header))
    .join("");
  const dataRows = rows
    .map((row, rowIndex) => {
      const excelRow = rowIndex + 2;
      const cells = headers
        .map((header, columnIndex) => cellXml(cellRef(excelRow, columnIndex + 1), row[header], 2, header))
        .join("");
      return `<row r="${excelRow}">${cells}</row>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <dimension ref="${dimension}"/>
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <cols>${cols}</cols>
  <sheetData>
    <row r="1">${headerCells}</row>
    ${dataRows}
  </sheetData>
  <pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>
</worksheet>`;
}

function stylesXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="1">
    <numFmt numFmtId="165" formatCode="yyyy-mm-dd"/>
  </numFmts>
  <fonts count="2">
    <font><sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/></font>
    <font><b/><sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFD9D9D9"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FF000000"/></left>
      <right style="thin"><color rgb="FF000000"/></right>
      <top style="thin"><color rgb="FF000000"/></top>
      <bottom style="thin"><color rgb="FF000000"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="4">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/>
    <xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
  <dxfs count="0"/>
  <tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/>
</styleSheet>`;
}

function workbookXml(sheetName: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="${sheetNameXml(sheetName)}" sheetId="1" r:id="rId1"/></sheets>
</workbook>`;
}

function workbookRelsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
}

function rootRelsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
}

function contentTypesXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;
}

const crcTable = new Uint32Array(256).map((_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date: Date): { time: number; date: number } {
  const year = Math.max(date.getFullYear(), 1980);
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

function writeUint16(target: Uint8Array, offset: number, value: number) {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
}

function writeUint32(target: Uint8Array, offset: number, value: number) {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
  target[offset + 2] = (value >>> 16) & 0xff;
  target[offset + 3] = (value >>> 24) & 0xff;
}

function concatParts(parts: Uint8Array[]): Uint8Array {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function createZip(files: Array<{ name: string; content: string }>): Uint8Array {
  const now = dosDateTime(new Date());
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = textEncoder.encode(file.name);
    const contentBytes = textEncoder.encode(file.content);
    const checksum = crc32(contentBytes);

    const localHeader = new Uint8Array(30 + nameBytes.length);
    writeUint32(localHeader, 0, 0x04034b50);
    writeUint16(localHeader, 4, 20);
    writeUint16(localHeader, 6, 0x0800);
    writeUint16(localHeader, 8, 0);
    writeUint16(localHeader, 10, now.time);
    writeUint16(localHeader, 12, now.date);
    writeUint32(localHeader, 14, checksum);
    writeUint32(localHeader, 18, contentBytes.length);
    writeUint32(localHeader, 22, contentBytes.length);
    writeUint16(localHeader, 26, nameBytes.length);
    writeUint16(localHeader, 28, 0);
    localHeader.set(nameBytes, 30);

    localParts.push(localHeader, contentBytes);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    writeUint32(centralHeader, 0, 0x02014b50);
    writeUint16(centralHeader, 4, 20);
    writeUint16(centralHeader, 6, 20);
    writeUint16(centralHeader, 8, 0x0800);
    writeUint16(centralHeader, 10, 0);
    writeUint16(centralHeader, 12, now.time);
    writeUint16(centralHeader, 14, now.date);
    writeUint32(centralHeader, 16, checksum);
    writeUint32(centralHeader, 20, contentBytes.length);
    writeUint32(centralHeader, 24, contentBytes.length);
    writeUint16(centralHeader, 28, nameBytes.length);
    writeUint16(centralHeader, 30, 0);
    writeUint16(centralHeader, 32, 0);
    writeUint16(centralHeader, 34, 0);
    writeUint16(centralHeader, 36, 0);
    writeUint32(centralHeader, 38, 0);
    writeUint32(centralHeader, 42, offset);
    centralHeader.set(nameBytes, 46);
    centralParts.push(centralHeader);

    offset += localHeader.length + contentBytes.length;
  }

  const centralDirectory = concatParts(centralParts);
  const endRecord = new Uint8Array(22);
  writeUint32(endRecord, 0, 0x06054b50);
  writeUint16(endRecord, 8, files.length);
  writeUint16(endRecord, 10, files.length);
  writeUint32(endRecord, 12, centralDirectory.length);
  writeUint32(endRecord, 16, offset);
  writeUint16(endRecord, 20, 0);

  return concatParts([...localParts, centralDirectory, endRecord]);
}

export function createStyledXlsxBlob(rows: ExcelRow[], sheetName: string): Blob {
  const files = [
    { name: "[Content_Types].xml", content: contentTypesXml() },
    { name: "_rels/.rels", content: rootRelsXml() },
    { name: "xl/workbook.xml", content: workbookXml(sheetName) },
    { name: "xl/_rels/workbook.xml.rels", content: workbookRelsXml() },
    { name: "xl/styles.xml", content: stylesXml() },
    { name: "xl/worksheets/sheet1.xml", content: worksheetXml(rows) },
  ];
  const archive = createZip(files);
  return new Blob([archive as BlobPart], { type: MIME_XLSX });
}

export function exportStyledXlsx(rows: ExcelRow[], sheetName: string, fileName: string) {
  const blob = createStyledXlsxBlob(rows, sheetName);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
