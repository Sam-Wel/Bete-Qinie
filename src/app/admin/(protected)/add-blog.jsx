import { useRef, useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import { router } from "expo-router";
import { supabase } from "../../../lib/supabaseClient";
import { BLOG_CONTENT_TYPES } from "../../../util/blogContentTypes";
import { isBlogContentEmpty } from "../../../util/renderBlogContent";
import { insertBlogPost } from "../../../util/blogPostWrites";
import BlogEditor from "../../../components/BlogEditor";
import { ScreenContainer, TextField, Button, ScreenHeader, Select } from "../../../components/ui";
import { colors, spacing, typography } from "../../../theme";

export default function AddBlogPost() {
  const [title, setTitle] = useState("");
  const [contentType, setContentType] = useState("ግዕዝ");
  const [writtenBy, setWrittenBy] = useState("");
  const [isPublished, setIsPublished] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const editorRef = useRef(null);
  const [editorKey, setEditorKey] = useState(0);

  const handleSubmit = async () => {
    const content = await editorRef.current?.getHTML();

    if (isBlogContentEmpty(content)) {
      setMessage("Please write some content before submitting.");
      return;
    }

    setLoading(true);

    const { error } = await insertBlogPost(supabase, {
      title,
      content,
      content_type: contentType,
      written_by: writtenBy,
      is_published: isPublished,
    });

    if (error) {
      console.error("Error adding blog post:", error);
      setMessage("An error occurred while adding the blog post.");
    } else {
      setMessage(isPublished ? "Blog post published successfully!" : "Draft saved successfully!");
      setTitle("");
      setContentType("ግዕዝ");
      setWrittenBy("");
      setIsPublished(true);
      setEditorKey((k) => k + 1); // remounts BlogEditor with a blank document
    }

    setLoading(false);
  };

  return (
    <ScreenContainer scroll keyboardAvoiding contentContainerStyle={styles.container}>
      <ScreenHeader title="Add New Blog Post" onBack={() => router.back()} />

      {message ? (
        <Text style={[typography.body, message.includes("success") ? styles.success : styles.error]}>
          {message}
        </Text>
      ) : null}

      <TextField label="Title" value={title} onChangeText={setTitle} placeholder="Enter the blog title" />

      <View style={styles.field}>
        <Text style={styles.label}>Content</Text>
        <BlogEditor key={editorKey} ref={editorRef} />
      </View>

      <Select
        label="Content Type"
        value={contentType}
        onValueChange={setContentType}
        items={BLOG_CONTENT_TYPES}
      />

      <TextField label="Written By" value={writtenBy} onChangeText={setWrittenBy} placeholder="Author's name" />

      <View style={styles.switchRow}>
        <Switch value={isPublished} onValueChange={setIsPublished} />
        <Text style={styles.switchLabel}>Publish immediately (off = save as a draft)</Text>
      </View>

      <Button variant="primary" onPress={handleSubmit} loading={loading}>
        {isPublished ? "Publish Post" : "Save Draft"}
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
