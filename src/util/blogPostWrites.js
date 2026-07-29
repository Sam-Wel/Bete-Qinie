// Supabase returns PGRST204 when a column referenced in the payload doesn't
// exist in the schema yet -- happens if
// supabase/add_is_published_column.sql hasn't been run. Retry once without
// is_published so basic posting/editing still works either way.
export async function insertBlogPost(supabase, payload) {
  const first = await supabase.from("blog_posts").insert([payload]);
  if (first.error?.code === "PGRST204") {
    const { is_published, ...fallback } = payload;
    return supabase.from("blog_posts").insert([fallback]);
  }
  return first;
}

export async function updateBlogPost(supabase, id, payload) {
  const first = await supabase.from("blog_posts").update(payload).eq("id", id);
  if (first.error?.code === "PGRST204") {
    const { is_published, ...fallback } = payload;
    return supabase.from("blog_posts").update(fallback).eq("id", id);
  }
  return first;
}
