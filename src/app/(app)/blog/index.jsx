import { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import { useBlogPosts } from "../../../hooks/useBlogPosts";
import { BLOG_CONTENT_TYPES } from "../../../util/blogContentTypes";
import { stripHtml, toHtmlSource } from "../../../util/renderBlogContent";
import { ScreenContainer, Card, TextField, Button, EmptyState, ScreenHeader, Select } from "../../../components/ui";
import { colors, fontFamily, spacing, typography } from "../../../theme";

const PREVIEW_LENGTH = 180;
const CONTENT_TYPE_ITEMS = [{ label: "All Content Types", value: "" }, ...BLOG_CONTENT_TYPES];

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
      <ScreenContainer center>
        <ActivityIndicator color={colors.primary} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer contentContainerStyle={styles.noPadding}>
      <View style={styles.controls}>
        <ScreenHeader title="ቅኔ አበው" titleEthiopic />
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
            <Link href={`/blog/${post.id}`} asChild>
              <Pressable>
                <Card style={styles.card}>
                  <Text style={styles.cardTitle}>{post.title}</Text>
                  <Text style={styles.cardMeta}>
                    By {post.written_by} | {new Date(post.created_date).toLocaleDateString()}
                  </Text>
                  <Text style={styles.cardPreview} numberOfLines={4}>
                    {preview}
                    {preview.length === PREVIEW_LENGTH ? "…" : ""}
                  </Text>
                </Card>
              </Pressable>
            </Link>
          );
        }}
        ListFooterComponent={
          totalPages > 1 && (
            <View style={styles.pagination}>
              <Button
                variant="secondary"
                size="sm"
                onPress={prevPage}
                disabled={page === 1}
              >
                Previous
              </Button>
              <Text style={styles.pageLabel}>
                Page {page} of {totalPages}
              </Text>
              <Button
                variant="secondary"
                size="sm"
                onPress={nextPage}
                disabled={page === totalPages}
              >
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
    color: colors.primary,
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
