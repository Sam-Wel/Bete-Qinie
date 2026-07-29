import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { supabase } from "../../../lib/supabaseClient";
import { BlogContent } from "../../../components/BlogContent";
import { useAuth } from "../../../context/AuthContext";

export default function BlogPostDetail() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
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
      // see "not found", mirroring the is_published RLS policy.
      if (error || !data || (data.is_published === false && !user)) {
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
  }, [id, user]);

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
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (notFound || !post) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: "Not found" }} />
        <Text style={styles.notFound}>Post not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: post.title }} />
      {post.is_published === false && (
        <View style={styles.draftBadge}>
          <Text style={styles.draftBadgeText}>Draft (only visible to you)</Text>
        </View>
      )}
      <Text style={styles.title}>{post.title}</Text>
      <Text style={styles.meta}>
        By {post.written_by} | {new Date(post.created_date).toLocaleDateString()}
      </Text>
      <BlogContent content={post.content} baseStyle={styles.content} />

      {user && (
        <View style={styles.actionsRow}>
          {confirmingDelete ? (
            <>
              <Pressable
                style={styles.confirmDeleteButton}
                onPress={handleDelete}
                disabled={deleting}
              >
                <Text style={styles.confirmDeleteText}>
                  {deleting ? "Deleting..." : "Confirm delete"}
                </Text>
              </Pressable>
              <Pressable style={styles.cancelButton} onPress={() => setConfirmingDelete(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable
                style={styles.actionButton}
                onPress={() => router.push(`/admin/update-blog/${post.id}`)}
              >
                <Text style={styles.actionButtonText}>Edit</Text>
              </Pressable>
              <Pressable style={styles.deleteButton} onPress={() => setConfirmingDelete(true)}>
                <Text style={styles.deleteButtonText}>Delete</Text>
              </Pressable>
            </>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  container: {
    padding: 20,
    gap: 8,
  },
  notFound: {
    color: "#78716c",
    fontSize: 16,
  },
  draftBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#fef9c3",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 4,
  },
  draftBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#854d0e",
  },
  title: {
    fontFamily: "NotoSansEthiopic_700Bold",
    fontSize: 26,
    color: "#1c1917",
  },
  meta: {
    fontSize: 13,
    color: "#78716c",
    marginBottom: 8,
  },
  content: {
    fontFamily: "NotoSansEthiopic_400Regular",
    fontSize: 15,
    color: "#44403c",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e7e5e4",
  },
  actionButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#f5f5f4",
  },
  actionButtonText: {
    color: "#44403c",
    fontWeight: "600",
    fontSize: 13,
  },
  deleteButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#fee2e2",
  },
  deleteButtonText: {
    color: "#b91c1c",
    fontWeight: "600",
    fontSize: 13,
  },
  confirmDeleteButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#dc2626",
  },
  confirmDeleteText: {
    color: "white",
    fontWeight: "600",
    fontSize: 13,
  },
  cancelButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#f5f5f4",
  },
  cancelButtonText: {
    color: "#44403c",
    fontWeight: "600",
    fontSize: 13,
  },
});
