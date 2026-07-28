import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { Link } from "expo-router";
import { useBlogPosts } from "../../../hooks/useBlogPosts";
import { BLOG_CONTENT_TYPES } from "../../../util/blogContentTypes";
import { stripHtml, toHtmlSource } from "../../../util/renderBlogContent";

const PREVIEW_LENGTH = 180;

export default function BlogList() {
  const [searchText, setSearchText] = useState("");
  const {
    paginatedPosts,
    filteredPosts,
    page,
    totalPages,
    nextPage,
    prevPage,
    loading,
    fetchError,
    filterContentType,
    handleSearch,
    handleFilterContentType,
  } = useBlogPosts();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <View style={styles.controls}>
        <TextInput
          value={searchText}
          onChangeText={(value) => {
            setSearchText(value);
            handleSearch(value);
          }}
          placeholder="Search posts..."
          style={styles.input}
        />
        <View style={styles.pickerWrapper}>
          <Picker selectedValue={filterContentType} onValueChange={handleFilterContentType}>
            <Picker.Item label="All Content Types" value="" />
            {BLOG_CONTENT_TYPES.map((type) => (
              <Picker.Item key={type.value} label={type.label} value={type.value} />
            ))}
          </Picker>
        </View>
      </View>

      {fetchError && <Text style={styles.error}>{fetchError}</Text>}

      <FlatList
        data={paginatedPosts}
        keyExtractor={(post) => String(post.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !fetchError && (
            <Text style={styles.empty}>
              No blog posts match your search or filter criteria.
            </Text>
          )
        }
        renderItem={({ item: post }) => {
          const preview = stripHtml(toHtmlSource(post.content)).slice(0, PREVIEW_LENGTH);
          return (
            <Link href={`/blog/${post.id}`} asChild>
              <Pressable style={styles.card}>
                <Text style={styles.cardTitle}>{post.title}</Text>
                <Text style={styles.cardMeta}>
                  By {post.written_by} | {new Date(post.created_date).toLocaleDateString()}
                </Text>
                <Text style={styles.cardPreview} numberOfLines={4}>
                  {preview}
                  {preview.length === PREVIEW_LENGTH ? "…" : ""}
                </Text>
              </Pressable>
            </Link>
          );
        }}
        ListFooterComponent={
          totalPages > 1 && (
            <View style={styles.pagination}>
              <Pressable
                style={[styles.pageButton, page === 1 && styles.pageButtonDisabled]}
                onPress={prevPage}
                disabled={page === 1}
              >
                <Text>Previous</Text>
              </Pressable>
              <Text style={styles.pageLabel}>
                Page {page} of {totalPages}
              </Text>
              <Pressable
                style={[styles.pageButton, page === totalPages && styles.pageButtonDisabled]}
                onPress={nextPage}
                disabled={page === totalPages}
              >
                <Text>Next</Text>
              </Pressable>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  controls: {
    padding: 16,
    gap: 10,
  },
  input: {
    padding: 12,
    fontSize: 15,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#d6d3d1",
    borderRadius: 8,
  },
  pickerWrapper: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#d6d3d1",
    borderRadius: 8,
  },
  error: {
    color: "#dc2626",
    textAlign: "center",
    marginBottom: 8,
  },
  empty: {
    textAlign: "center",
    color: "#78716c",
    marginTop: 24,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#d6d3d1",
    borderRadius: 10,
    padding: 16,
    gap: 6,
    backgroundColor: "#eff6ff",
  },
  cardTitle: {
    fontFamily: "NotoSansEthiopic_700Bold",
    fontSize: 18,
    color: "#1e3a5f",
  },
  cardMeta: {
    fontSize: 12,
    color: "#78716c",
  },
  cardPreview: {
    fontFamily: "NotoSansEthiopic_400Regular",
    fontSize: 14,
    color: "#44403c",
  },
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    marginTop: 16,
  },
  pageButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: "#f5f5f4",
  },
  pageButtonDisabled: {
    opacity: 0.5,
  },
  pageLabel: {
    color: "#57534e",
  },
});
