/** Parse ?limit=&offset= with safe bounds */
export function parsePagination(query: { limit?: unknown; offset?: unknown }, defaults = { limit: 50, max: 200 }) {
  const limit = Math.min(
    defaults.max,
    Math.max(1, parseInt(String(query.limit ?? defaults.limit), 10) || defaults.limit),
  );
  const offset = Math.max(0, parseInt(String(query.offset ?? 0), 10) || 0);
  return { limit, offset };
}
