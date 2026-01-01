import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../util/supabaseClient";

const UpdateBlogPost = () => {
  const { id } = useParams(); // Get the blog post ID from the URL
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [contentType, setContentType] = useState("");
  const [writtenBy, setWrittenBy] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchPost = async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("id", id)
        .single(); // Fetch a single blog post by ID

      if (error) {
        console.error("Error fetching blog post:", error);
        setMessage("Failed to fetch blog post.");
      } else {
        setTitle(data.title);
        setContent(data.content);
        setContentType(data.content_type);
        setWrittenBy(data.written_by);
      }
    };

    fetchPost();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase
      .from("blog_posts")
      .update({
        title,
        content,
        content_type: contentType,
        written_by: writtenBy,
      })
      .eq("id", id);

    if (error) {
      console.error("Error updating blog post:", error);
      setMessage("An error occurred while updating the blog post.");
    } else {
      setMessage("Blog post updated successfully!");
      setTimeout(() => navigate("/blog"), 1500); // Redirect to blog list after 1.5 seconds
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-white shadow-lg rounded-lg p-8 mt-16">
        <h1 className="text-3xl font-bold text-yellow-600 mb-6 text-center">
          Update Blog Post
        </h1>
        {message && (
          <div
            className={`mb-4 p-4 text-white rounded ${
              message.includes("successfully") ? "bg-green-500" : "bg-red-500"
            }`}
          >
            {message}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="title" className="block text-gray-700 font-medium mb-2">
              Title
            </label>
            <input
              type="text"
              id="title"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="mb-6">
            <label htmlFor="content" className="block text-gray-700 font-medium mb-2">
              Content
            </label>
            <textarea
              id="content"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              rows="6"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            ></textarea>
          </div>
          <div className="mb-6">
            <label
              htmlFor="contentType"
              className="block text-gray-700 font-medium mb-2"
            >
              Content Type
            </label>
            <select
              id="contentType"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              value={contentType}
              onChange={(e) => setContentType(e.target.value)}
              required
            >
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
          <div className="mb-6">
            <label
              htmlFor="writtenBy"
              className="block text-gray-700 font-medium mb-2"
            >
              Written By
            </label>
            <input
              type="text"
              id="writtenBy"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              value={writtenBy}
              onChange={(e) => setWrittenBy(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className={`w-full text-white font-medium rounded-lg px-4 py-2 ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-yellow-500 hover:bg-yellow-600"
            }`}
            disabled={loading}
          >
            {loading ? "Updating..." : "Update Blog Post"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UpdateBlogPost;
