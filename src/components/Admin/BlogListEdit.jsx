import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../util/supabaseClient";

const BlogListEdit = () => {
  const [posts, setPosts] = useState([]);
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterContentType, setFilterContentType] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    const fetchPosts = async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .order("created_date", { ascending: false });

      if (error) {
        console.error("Error fetching blog posts:", error);
      } else {
        setPosts(data);
        setFilteredPosts(data);
      }
      setLoading(false);
    };

    fetchPosts();
  }, []);

  const handleSearch = (e) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);

    const filtered = posts.filter(
      (post) =>
        post.title.toLowerCase().includes(query) ||
        post.content.toLowerCase().includes(query) ||
        post.written_by.toLowerCase().includes(query)
    );

    if (filterContentType) {
      setFilteredPosts(filtered.filter((post) => post.content_type === filterContentType));
    } else {
      setFilteredPosts(filtered);
    }
  };

  const handleFilterContentType = (e) => {
    const type = e.target.value;
    setFilterContentType(type);

    const filtered = posts.filter((post) =>
      searchQuery
        ? post.content_type === type &&
          (post.title.toLowerCase().includes(searchQuery) ||
            post.content.toLowerCase().includes(searchQuery) ||
            post.written_by.toLowerCase().includes(searchQuery))
        : post.content_type === type
    );

    setFilteredPosts(type ? filtered : posts);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-lg text-gray-500">Loading blog posts...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 pt-24">
      <h1 className="text-4xl font-bold mb-6 text-center text-gray-800">ቤተ ቅኔ - Edit Blogs</h1>

      {/* Search and Filter Section */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <input
          type="text"
          placeholder="Search posts..."
          value={searchQuery}
          onChange={handleSearch}
          className="w-full md:w-1/2 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-yellow-500 shadow-sm"
        />
        <select
          value={filterContentType}
          onChange={handleFilterContentType}
          className="w-full md:w-1/3 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-yellow-500 shadow-sm"
        >
          <option value="">All Content Types</option>
          <option value="ግዕዝ">ጉባኤ ቃና - ግዕዝ</option>
          <option value="እዝል">ጉባኤ ቃና - እዝል</option>
          <option value="ዘአምላኪየ">ዘአምላኪየ</option>
          <option value="ሚበዝሑ">ሚበዝሑ</option>
          <option value="ዋዜማ">ዋዜማ</option>
          <option value="ሥላሴ">ሥላሴ</option>
          <option value="ዕጣነ-ሞገር">ዕጣነ ሞገር</option>
          <option value="አገባብ">አገባብ</option>
        </select>
      </div>

      {/* Blog Posts */}
      {filteredPosts.length === 0 ? (
        <p className="text-gray-500 text-center">No blog posts match your search or filter criteria.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map((post) => (
            <div
              key={post.id}
              className="relative border rounded-lg p-6 shadow-md bg-white hover:shadow-lg transition-shadow"
            >
              <h2 className="text-xl font-semibold text-gray-800">{post.title}</h2>
              <p className="text-sm text-gray-500">
                By {post.written_by} | {new Date(post.created_date).toLocaleDateString()}
              </p>
              <div
                className="mt-4 text-gray-700 whitespace-pre-line"
                dangerouslySetInnerHTML={{
                  __html: post.content.replace(/\n/g, "<br />"),
                }}
              ></div>
              <button
                onClick={() => navigate(`/update-blog/${post.id}`)}
                className="absolute top-2 right-2 text-sm px-3 py-1 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition"
              >
                Edit
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BlogListEdit;
