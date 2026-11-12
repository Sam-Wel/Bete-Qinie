// Every row of a Supabase query, a page at a time (the API returns at most
// 1,000 rows per request). `query` builds the request afresh for each page.
export const PAGE = 1000;

export async function fetchAll(query, page = PAGE) {
  const rows = [];
  for (let from = 0; ; from += page) {
    const { data, error } = await query().range(from, from + page - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < page) return rows;
  }
}
