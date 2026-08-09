import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Switch, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "../../../../lib/supabaseClient";
import { BLOG_CONTENT_TYPES } from "../../../../util/blogContentTypes";
import { isBlogContentEmpty } from "../../../../util/renderBlogContent";
import { updateBlogPost } from "../../../../util/blogPostWrites";
import { snapshotBlogPostRevision } from "../../../../util/blogPostRevisions";
import BlogEditor from "../../../../components/BlogEditor";
import { ScreenContainer, TextField, Button, ScreenHeader, Select } from "../../../../components/ui";
import { colors, spacing, typography } from "../../../../theme";

export default function UpdateBlogPost() {
  const { id } = useLocalSearchParams();

  const [title, setTitle] = useState("");
  const [initialContent, setInitialContent] = useState(null);
  const [contentType, setContentType] = useState("");
  const [writtenBy, setWrittenBy] = useState("");
  const [isPublished, setIsPublished] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [originalPost, setOriginalPost] = useState(null);
  const editorRef = useRef(null);

  useEffect(() => {
    const fetchPost = async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching blog post:", error);
        setMessage("Failed to fetch blog post.");
      } else {
        setTitle(data.title);
        setInitialContent(data.content || "");
        setContentType(data.content_type);
        setWrittenBy(data.written_by);
        setIsPublished(data.is_published ?? true);
        setOriginalPost(data);
      }
    };

    fetchPost();
  }, [id]);

  const handleSubmit = async () => {
    const content = await editorRef.current?.getHTML();

    if (isBlogContentEmpty(content)) {
      setMessage("Please write some content before submitting.");
      return;
    }

    setLoading(true);

    await snapshotBlogPostRevision(supabase, id, originalPost);

    const { error } = await updateBlogPost(supabase, id, {
      title,
      content,
      content_type: contentType,
      written_by: writtenBy,
      is_published: isPublished,
    });

    if (error) {
      console.error("Error updating blog post:", error);
      setMessage("An error occurred while updating the blog post.");
      setLoading(false);
    } else {
      setMessage("Blog post updated successfully!");
      setTimeout(() => router.replace("/admin/blog-list-edit"), 1500);
    }
  };

  if (initialContent === null) {
    return (
      <ScreenContainer center>
        {message ? (
          <Text style={[typography.body, { color: colors.danger }]}>{message}</Text>
        ) : (
          <ActivityIndicator color={colors.primary} />
        )}
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll keyboardAvoiding contentContainerStyle={styles.container}>
      <ScreenHeader title="Update Blog Post" onBack={() => router.back()} />

      {message ? (
        <Text style={[typography.body, message.includes("success") ? styles.success : styles.error]}>
          {message}
        </Text>
      ) : null}

      <TextField label="Title" value={title} onChangeText={setTitle} />

      <View style={styles.field}>
        <Text style={styles.label}>Content</Text>
        <BlogEditor ref={editorRef} initialContent={initialContent} />
      </View>

      <Select
        label="Content Type"
        value={contentType}
        onValueChange={setContentType}
        items={BLOG_CONTENT_TYPES}
      />

      <TextField label="Written By" value={writtenBy} onChangeText={setWrittenBy} />

      <View style={styles.switchRow}>
        <Switch value={isPublished} onValueChange={setIsPublished} />
        <Text style={styles.switchLabel}>Published (off = unpublish / save as a draft)</Text>
      </View>

      <Button variant="primary" onPress={handleSubmit} loading={loading}>
        Update Blog Post
      </Button>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    maxWidth: 560,
    width: "100%",
    alignSelf: "center",
  },
  field: { gap: spacing.xs },
  label: {
    ...typography.label,
    color: colors.textSecondary,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 2,
  },
  switchLabel: {
    flex: 1,
    ...typography.caption,
    color: colors.textSecondary,
  },
  error: {
    color: colors.danger,
    textAlign: "center",
  },
  success: {
    color: colors.success,
    textAlign: "center",
  },
});
