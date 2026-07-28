import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

const PAGE_SIZE = 9;

// includeDrafts: true for the admin list (shows everything), false for
// public-facing views (hides unpublished posts). Filtering happens
// client-side after fetch, rather than in the query, so this keeps working
// even before the is_published column migration has been run (an
// unmigrated row simply has post.is_published === undefined, which passes
// the "!== false" check below).
export function useBlogPosts({ includeDrafts = false } = {}) {
  const [posts, setPosts] = useState([]);
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterContentType, setFilterContentType] = useState("");
  const [page, setPage] = useState(1);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setFetchError(null);

    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .order("created_date", { ascending: false });

    if (error) {
      console.error("Error fetching blog posts:", error);
      setFetchError("Failed to load blog posts.");
    } else {
      setPosts(includeDrafts ? data : data.filter((post) => post.is_published !== false));
    }
    setLoading(false);
  }, [includeDrafts]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  useEffect(() => {
    let filtered = posts;

    if (searchQuery) {
      filtered = filtered.filter(
        (post) =>
          (post.title || "").toLowerCase().includes(searchQuery) ||
          (post.content || "").toLowerCase().includes(searchQuery) ||
          (post.written_by || "").toLowerCase().includes(searchQuery)
      );
    }

    if (filterContentType) {
      filtered = filtered.filter((post) => post.content_type === filterContentType);
    }

    setFilteredPosts(filtered);
    setPage(1);
  }, [posts, searchQuery, filterContentType]);

  // Takes raw values (not DOM events) since callers are RN TextInput/Picker.
  const handleSearch = (value) => setSearchQuery(value.toLowerCase());
  const handleFilterContentType = (value) => setFilterContentType(value);

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / PAGE_SIZE));
  const paginatedPosts = filteredPosts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const nextPage = () => setPage((p) => Math.min(p + 1, totalPages));
  const prevPage = () => setPage((p) => Math.max(p - 1, 1));

  const deletePost = async (id) => {
    const { error } = await supabase.from("blog_posts").delete().eq("id", id);
    if (error) {
      console.error("Error deleting blog post:", error);
      return false;
    }
    setPosts((prev) => prev.filter((post) => post.id !== id));
    return true;
  };

  return {
    posts,
    filteredPosts,
    paginatedPosts,
    page,
    totalPages,
    nextPage,
    prevPage,
    loading,
    fetchError,
    searchQuery,
    filterContentType,
    handleSearch,
    handleFilterContentType,
    deletePost,
  };
}
