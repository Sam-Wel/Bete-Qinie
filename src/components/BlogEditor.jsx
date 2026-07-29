import { forwardRef, useImperativeHandle, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { RichText, Toolbar, useEditorBridge } from "@10play/tentap-editor";
import { supabase } from "../lib/supabaseClient";

const IMAGE_BUCKET = "blog-images";

// Cross-platform (web/iOS/Android) replacement for the portfolio's
// react-quill-new editor, which is DOM-only and has no RN equivalent.
// Exposes getHTML()/setContent() via ref so the parent form can read/seed
// content without re-rendering the editor itself.
const BlogEditor = forwardRef(function BlogEditor({ initialContent }, ref) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const editor = useEditorBridge({
    autofocus: false,
    avoidIosKeyboard: true,
    initialContent: initialContent || "",
  });

  useImperativeHandle(ref, () => ({
    getHTML: () => editor.getHTML(),
  }));

  const handleInsertImage = async () => {
    setUploadError(null);

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setUploadError("Permission to access photos was denied.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setUploading(true);

    try {
      const response = await fetch(asset.uri);
      const arrayBuffer = await response.arrayBuffer();
      const extension = asset.uri.split(".").pop()?.split("?")[0] || "jpg";
      const path = `${Date.now()}.${extension}`;

      const { error: uploadErr } = await supabase.storage
        .from(IMAGE_BUCKET)
        .upload(path, arrayBuffer, {
          contentType: asset.mimeType || `image/${extension}`,
        });

      if (uploadErr) {
        console.error("Error uploading blog image:", uploadErr);
        setUploadError("Failed to upload image.");
        return;
      }

      const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path);
      if (data?.publicUrl) {
        editor.setImage(data.publicUrl);
      }
    } catch (err) {
      console.error("Unexpected error uploading blog image:", err);
      setUploadError("Failed to upload image.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.editorBox}>
        <RichText editor={editor} />
      </View>
      <Toolbar editor={editor} />
      <Pressable
        style={styles.imageButton}
        onPress={handleInsertImage}
        disabled={uploading}
      >
        <Text style={styles.imageButtonText}>
          {uploading ? "Uploading..." : "Insert Image"}
        </Text>
      </Pressable>
      {uploadError && <Text style={styles.error}>{uploadError}</Text>}
    </View>
  );
});

export default BlogEditor;

const styles = StyleSheet.create({
  wrapper: { gap: 8 },
  editorBox: {
    height: 260,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#d6d3d1",
    borderRadius: 8,
    overflow: "hidden",
  },
  imageButton: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: "#f5f5f4",
  },
  imageButtonText: {
    color: "#44403c",
    fontWeight: "600",
  },
  error: {
    color: "#dc2626",
  },
});
