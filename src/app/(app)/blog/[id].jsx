import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
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
        <ScreenHeader title="ቅኔ አበው" titleEthiopic onBack={() => router.back()} />
        <EmptyState message="Post not found." icon="alert-circle-outline" />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll>
      <Stack.Screen options={{ title: post.title }} />
      <ScreenHeader title={post.title} titleEthiopic onBack={() => router.back()} />

      {post.is_published === false && (
        <Badge label="Draft (only visible to you)" tone="warning" />
      )}
      <Text style={styles.meta}>
        By {post.written_by} | {new Date(post.created_date).toLocaleDateString()}
      </Text>
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
  content: {
    fontFamily: fontFamily.ethiopicRegular,
    fontSize: 15,
    color: colors.textSecondary,
  },
  actionsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderMuted,
  },
});
