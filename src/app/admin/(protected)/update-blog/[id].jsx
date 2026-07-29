import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "../../../../lib/supabaseClient";
import { BLOG_CONTENT_TYPES } from "../../../../util/blogContentTypes";
import { isBlogContentEmpty } from "../../../../util/renderBlogContent";
import { updateBlogPost } from "../../../../util/blogPostWrites";
import { snapshotBlogPostRevision } from "../../../../util/blogPostRevisions";
import BlogEditor from "../../../../components/BlogEditor";

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
      <View style={styles.center}>
        {message ? <Text style={styles.error}>{message}</Text> : <ActivityIndicator />}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Update Blog Post</Text>

        {message ? (
          <Text style={message.includes("success") ? styles.success : styles.error}>
            {message}
          </Text>
        ) : null}

        <View style={styles.field}>
          <Text style={styles.label}>Title</Text>
          <TextInput value={title} onChangeText={setTitle} style={styles.input} />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Content</Text>
          <BlogEditor ref={editorRef} initialContent={initialContent} />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Content Type</Text>
          <View style={styles.pickerWrapper}>
            <Picker selectedValue={contentType} onValueChange={setContentType}>
              {BLOG_CONTENT_TYPES.map((type) => (
                <Picker.Item key={type.value} label={type.label} value={type.value} />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Written By</Text>
          <TextInput value={writtenBy} onChangeText={setWrittenBy} style={styles.input} />
        </View>

        <View style={styles.switchRow}>
          <Switch value={isPublished} onValueChange={setIsPublished} />
          <Text style={styles.switchLabel}>
            Published (off = unpublish / save as a draft)
          </Text>
        </View>

        <Pressable style={styles.button} onPress={handleSubmit} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? "Updating..." : "Update Blog Post"}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  container: {
    padding: 24,
    gap: 14,
    maxWidth: 560,
    width: "100%",
    alignSelf: "center",
  },
  title: {
    fontFamily: "NotoSansEthiopic_700Bold",
    fontSize: 24,
    textAlign: "center",
    marginBottom: 8,
  },
  field: { gap: 6 },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#57534e",
  },
  input: {
    padding: 12,
    fontSize: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#d6d3d1",
    borderRadius: 8,
  },
  pickerWrapper: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#d6d3d1",
    borderRadius: 8,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  switchLabel: {
    flex: 1,
    fontSize: 14,
    color: "#57534e",
  },
  button: {
    backgroundColor: "#854d0e",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  error: {
    color: "#dc2626",
    textAlign: "center",
  },
  success: {
    color: "#16a34a",
    textAlign: "center",
  },
});
