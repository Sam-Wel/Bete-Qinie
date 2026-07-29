import { useRef, useState } from "react";
import {
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
import { supabase } from "../../../lib/supabaseClient";
import { BLOG_CONTENT_TYPES } from "../../../util/blogContentTypes";
import { isBlogContentEmpty } from "../../../util/renderBlogContent";
import { insertBlogPost } from "../../../util/blogPostWrites";
import BlogEditor from "../../../components/BlogEditor";

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
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Add New Blog Post</Text>

        {message ? (
          <Text style={message.includes("success") ? styles.success : styles.error}>
            {message}
          </Text>
        ) : null}

        <View style={styles.field}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Enter the blog title"
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Content</Text>
          <BlogEditor key={editorKey} ref={editorRef} />
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
          <TextInput
            value={writtenBy}
            onChangeText={setWrittenBy}
            placeholder="Author's name"
            style={styles.input}
          />
        </View>

        <View style={styles.switchRow}>
          <Switch value={isPublished} onValueChange={setIsPublished} />
          <Text style={styles.switchLabel}>
            Publish immediately (off = save as a draft)
          </Text>
        </View>

        <Pressable style={styles.button} onPress={handleSubmit} disabled={loading}>
          <Text style={styles.buttonText}>
            {loading ? "Saving..." : isPublished ? "Publish Post" : "Save Draft"}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
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
