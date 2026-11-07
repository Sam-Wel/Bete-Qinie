import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Link, router, Stack, useLocalSearchParams } from "expo-router";
import { QINE } from "../../../data/qine";
import { supabase } from "../../../lib/supabaseClient";
import { BlogContent } from "../../../components/BlogContent";
import { useAuth } from "../../../context/AuthContext";
import { ScreenContainer, Button, Badge, ScreenHeader, EmptyState } from "../../../components/ui";
import { colors, fontFamily, spacing, typography } from "../../../theme";

export default function BlogPostDetail() {
  const { id } = useLocalSearchParams();
  const { isAdmin } = useAuth();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchPost = async () => {
      setLoading(true);
      setNotFound(false);

      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("id", id)
        .single();

      if (cancelled) return;

      // Drafts are only visible to a logged-in admin -- anonymous visitors
      // and regular signed-in users see "not found", mirroring the
      // is_published RLS policy.
      if (error || !data || (data.is_published === false && !isAdmin)) {
        setNotFound(true);
        setPost(null);
      } else {
        setPost(data);
      }
      setLoading(false);
    };

    fetchPost();
    return () => {
      cancelled = true;
    };
  }, [id, isAdmin]);

  const handleDelete = async () => {
    setDeleting(true);
    const { error } = await supabase.from("blog_posts").delete().eq("id", id);
    setDeleting(false);
    if (error) {
      console.error("Error deleting blog post:", error);
      return;
    }
    router.replace("/admin/blog-list-edit");
  };

  if (loading) {
    return (
      <ScreenContainer center>
        <ActivityIndicator color={colors.primary} />
      </ScreenContainer>
    );
  }

  if (notFound || !post) {
    return (
      <ScreenContainer center>
        <Stack.Screen options={{ title: "Not found" }} />
        <EmptyState message="Post not found." icon="alert-circle-outline" />
      </ScreenContainer>
    );
  }

  // A ቅኔ that also has a recording in ዜማ links to it.
  const chanted = QINE.find((q) => q.blogId === Number(post.id));

  return (
    <ScreenContainer scroll>
      <Stack.Screen options={{ title: post.title }} />
      <ScreenHeader title={post.title} titleEthiopic />

      {post.is_published === false && (
        <Badge label="Draft (only visible to you)" tone="warning" />
      )}
      <Text style={styles.meta}>
        {[
          post.written_by?.trim() ? `By ${post.written_by.trim()}` : null,
          new Date(post.created_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
        ]
          .filter(Boolean)
          .join("  ·  ")}
      </Text>
      {chanted ? (
        <Link href={`/zema/${chanted.id}`} style={styles.listen}>
          ♪ Listen to it chanted in ዜማ ›
        </Link>
      ) : null}
      <BlogContent content={post.content} baseStyle={styles.content} />

      {isAdmin && (
        <View style={styles.actionsRow}>
          {confirmingDelete ? (
            <>
              <Button variant="dangerConfirm" size="sm" pill onPress={handleDelete} loading={deleting}>
                Confirm delete
              </Button>
              <Button variant="secondary" size="sm" pill onPress={() => setConfirmingDelete(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="secondary"
                size="sm"
                pill
                onPress={() => router.push(`/admin/update-blog/${post.id}`)}
              >
                Edit
              </Button>
              <Button variant="danger" size="sm" pill onPress={() => setConfirmingDelete(true)}>
                Delete
              </Button>
            </>
          )}
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  meta: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  // Large enough to read a ቅኔ comfortably, like the text on the ዜማ page.
  content: {
    fontFamily: fontFamily.ethiopicRegular,
    fontSize: 19,
    lineHeight: 34,
    color: colors.textPrimary,
  },
  listen: { ...typography.label, color: colors.primaryDark, marginBottom: spacing.md },
  actionsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderMuted,
  },
});
