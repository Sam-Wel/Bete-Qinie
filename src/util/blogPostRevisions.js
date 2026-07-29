// Best-effort snapshot of the pre-edit version of a post. Failing silently
// (just a console warning) is deliberate: history is a nice-to-have, and a
// missing blog_post_revisions table (migration not run yet -- see
// supabase/create_blog_post_revisions_table.sql) shouldn't block the actual
// edit from saving.
export async function snapshotBlogPostRevision(supabase, postId, previous) {
  if (!previous) return;

  const { error } = await supabase.from("blog_post_revisions").insert([
    {
      post_id: postId,
      title: previous.title,
      content: previous.content,
      content_type: previous.content_type,
      written_by: previous.written_by,
    },
  ]);

  if (error) {
    console.warn(
      "Could not save a revision snapshot (has supabase/create_blog_post_revisions_table.sql been run?):",
      error
    );
  }
}
