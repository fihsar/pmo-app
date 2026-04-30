"use client";

/**
 * Parses an Excel ArrayBuffer in a Web Worker so the main thread stays
 * responsive during large file reads.
 *
 * Falls back to synchronous parsing if the Worker API is unavailable
 * (e.g. older browsers, Jest test environment).
 */
export async function parseXlsxInWorker(
  buffer: ArrayBuffer
): Promise<Record<string, unknown>[]> {
  if (typeof Worker === "undefined") {
    // Synchronous fallback
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(new Uint8Array(buffer), { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json(sheet, { defval: null }) as Record<string, unknown>[];
  }

  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("../workers/xlsx-parser.worker.ts", import.meta.url)
    );

    worker.onmessage = (e: MessageEvent<{ rows?: Record<string, unknown>[]; error?: string }>) => {
      worker.terminate();
      if (e.data.error) {
        reject(new Error(e.data.error));
      } else {
        resolve(e.data.rows ?? []);
      }
    };

    worker.onerror = (err) => {
      worker.terminate();
      reject(err);
    };

    // Transfer ownership of the buffer to avoid a copy
    worker.postMessage({ buffer }, [buffer]);
  });
}
