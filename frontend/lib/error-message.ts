export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;

  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const parts = [record.message, record.details, record.hint, record.code]
      .filter((part): part is string => typeof part === "string" && part.trim().length > 0);

    if (parts.length > 0) return parts.join(" ");

    try {
      return JSON.stringify(error);
    } catch {
      return "Unknown object error";
    }
  }

  return String(error);
}

export function isMissingSubcategoryError(message: string): boolean {
  const normalized = message.toLowerCase();
  return normalized.includes("subcategory") || normalized.includes("css_subcategory") || (
    normalized.includes("schema cache") && normalized.includes("column")
  );
}
