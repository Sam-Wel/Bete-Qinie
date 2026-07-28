import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { supabase } from "../../../lib/supabaseClient";
import { BlogContent } from "../../../components/BlogContent";

export default function BlogPostDetail() {
  const { id } = useLocalSearchParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

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

      // Drafts are admin-only; Phase 5 adds the auth check that would let a
      // logged-in admin see them. Until then, every visitor is anonymous.
      if (error || !data || data.is_published === false) {
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
  }, [id]);

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
      <Text style={styles.title}>{post.title}</Text>
      <Text style={styles.meta}>
        By {post.written_by} | {new Date(post.created_date).toLocaleDateString()}
      </Text>
      <BlogContent content={post.content} baseStyle={styles.content} />
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
});
