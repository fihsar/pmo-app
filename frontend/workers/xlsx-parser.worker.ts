/**
 * Web Worker: parse an Excel ArrayBuffer off the main thread.
 *
 * Message in:  { buffer: ArrayBuffer }
 * Message out: { rows: Record<string, unknown>[] }
 *              { error: string }
 *
 * Turbopack / webpack bundle this file as a separate worker chunk when
 * referenced via new Worker(new URL('../workers/xlsx-parser.worker.ts', import.meta.url)).
 */
import * as XLSX from "xlsx";

self.onmessage = (event: MessageEvent<{ buffer: ArrayBuffer }>) => {
  try {
    const { buffer } = event.data;
    const workbook = XLSX.read(new Uint8Array(buffer), { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { defval: null }) as Record<string, unknown>[];
    self.postMessage({ rows });
  } catch (err) {
    self.postMessage({ error: err instanceof Error ? err.message : String(err) });
  }
};
