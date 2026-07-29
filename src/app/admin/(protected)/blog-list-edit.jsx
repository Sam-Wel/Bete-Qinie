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
import { router } from "expo-router";
import { useBlogPosts } from "../../../hooks/useBlogPosts";
import { BLOG_CONTENT_TYPES } from "../../../util/blogContentTypes";
import { stripHtml, toHtmlSource } from "../../../util/renderBlogContent";

const PREVIEW_LENGTH = 140;

export default function BlogListEdit() {
  const [searchText, setSearchText] = useState("");
  const [confirmingId, setConfirmingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
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
    deletePost,
  } = useBlogPosts({ includeDrafts: true });

  const handleDelete = async (id) => {
    setDeletingId(id);
    await deletePost(id);
    setDeletingId(null);
    setConfirmingId(null);
  };

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
            <Text style={styles.empty}>No blog posts match your search or filter criteria.</Text>
          )
        }
        renderItem={({ item: post }) => {
          const preview = stripHtml(toHtmlSource(post.content)).slice(0, PREVIEW_LENGTH);
          return (
            <View style={styles.card}>
              {post.is_published === false && (
                <View style={styles.draftBadge}>
                  <Text style={styles.draftBadgeText}>Draft</Text>
                </View>
              )}
              <Text style={styles.cardTitle}>{post.title}</Text>
              <Text style={styles.cardMeta}>
                By {post.written_by} | {new Date(post.created_date).toLocaleDateString()}
              </Text>
              <Text style={styles.cardPreview} numberOfLines={3}>
                {preview}
                {preview.length === PREVIEW_LENGTH ? "…" : ""}
              </Text>

              <View style={styles.actionsRow}>
                {confirmingId === post.id ? (
                  <>
                    <Pressable
                      style={styles.confirmDeleteButton}
                      onPress={() => handleDelete(post.id)}
                      disabled={deletingId === post.id}
                    >
                      <Text style={styles.confirmDeleteText}>
                        {deletingId === post.id ? "Deleting..." : "Confirm delete"}
                      </Text>
                    </Pressable>
                    <Pressable style={styles.cancelButton} onPress={() => setConfirmingId(null)}>
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
                    <Pressable
                      style={styles.deleteButton}
                      onPress={() => setConfirmingId(post.id)}
                    >
                      <Text style={styles.deleteButtonText}>Delete</Text>
                    </Pressable>
                  </>
                )}
              </View>
            </View>
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
  },
  draftBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#fef9c3",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    marginBottom: 4,
  },
  draftBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#854d0e",
  },
  cardTitle: {
    fontFamily: "NotoSansEthiopic_700Bold",
    fontSize: 18,
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
  actionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
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
