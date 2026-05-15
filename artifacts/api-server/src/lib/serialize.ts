/**
 * Recursively convert Date objects to ISO strings in a value so that Zod
 * schemas (which expect `string` for date fields) can parse them correctly.
 */
export function serializeDates<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value.toISOString() as unknown as T;
  if (Array.isArray(value)) return value.map(serializeDates) as unknown as T;
  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as object)) {
      result[k] = serializeDates(v);
    }
    return result as T;
  }
  return value;
}
