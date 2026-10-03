import { useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useBlogPosts } from "../../../hooks/useBlogPosts";
import { BLOG_CONTENT_TYPES } from "../../../util/blogContentTypes";
import { stripHtml, toHtmlSource } from "../../../util/renderBlogContent";
import { ScreenContainer, Card, TextField, Button, Badge, EmptyState, AdminHeader, Select } from "../../../components/ui";
import { colors, fontFamily, spacing, typography } from "../../../theme";

const PREVIEW_LENGTH = 140;
const CONTENT_TYPE_ITEMS = [{ label: "All Content Types", value: "" }, ...BLOG_CONTENT_TYPES];

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
      <ScreenContainer center>
        <ActivityIndicator color={colors.primary} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer contentContainerStyle={styles.noPadding}>
      <View style={styles.controls}>
        <AdminHeader />
        <TextField
          value={searchText}
          onChangeText={(value) => {
            setSearchText(value);
            handleSearch(value);
          }}
          placeholder="Search posts..."
        />
        <Select
          value={filterContentType}
          onValueChange={handleFilterContentType}
          items={CONTENT_TYPE_ITEMS}
        />
      </View>

      {fetchError && <Text style={styles.error}>{fetchError}</Text>}

      <FlatList
        data={paginatedPosts}
        keyExtractor={(post) => String(post.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !fetchError && (
            <EmptyState
              message="No blog posts match your search or filter criteria."
              icon="document-text-outline"
            />
          )
        }
        renderItem={({ item: post }) => {
          const preview = stripHtml(toHtmlSource(post.content)).slice(0, PREVIEW_LENGTH);
          return (
            <Card style={styles.card}>
              <View style={styles.badges}>
                {post.is_public ? (
                  <Badge label="Public" tone="primary" />
                ) : (
                  <Badge label="Private" tone="muted" />
                )}
                {post.is_published === false && <Badge label="Draft" tone="warning" />}
              </View>
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
                    <Button
                      variant="dangerConfirm"
                      size="sm"
                      pill
                      onPress={() => handleDelete(post.id)}
                      loading={deletingId === post.id}
                    >
                      Confirm delete
                    </Button>
                    <Button variant="secondary" size="sm" pill onPress={() => setConfirmingId(null)}>
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
                    <Button variant="danger" size="sm" pill onPress={() => setConfirmingId(post.id)}>
                      Delete
                    </Button>
                  </>
                )}
              </View>
            </Card>
          );
        }}
        ListFooterComponent={
          totalPages > 1 && (
            <View style={styles.pagination}>
              <Button variant="secondary" size="sm" onPress={prevPage} disabled={page === 1}>
                Previous
              </Button>
              <Text style={styles.pageLabel}>
                Page {page} of {totalPages}
              </Text>
              <Button variant="secondary" size="sm" onPress={nextPage} disabled={page === totalPages}>
                Next
              </Button>
            </View>
          )
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  badges: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  noPadding: { padding: 0 },
  controls: {
    padding: spacing.lg,
    gap: spacing.sm + 2,
  },
  error: {
    ...typography.body,
    color: colors.danger,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  card: {
    gap: spacing.xs + 2,
  },
  cardTitle: {
    fontFamily: fontFamily.ethiopicBold,
    fontSize: 18,
    color: colors.textPrimary,
  },
  cardMeta: {
    ...typography.caption,
    color: colors.textMuted,
  },
  cardPreview: {
    fontFamily: fontFamily.ethiopicRegular,
    fontSize: 14,
    color: colors.textSecondary,
  },
  actionsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
    marginTop: spacing.lg,
  },
  pageLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
