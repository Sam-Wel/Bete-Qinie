import React, { useState } from "react";
import { supabase } from "../../util/supabaseClient";

const AddBlogPost = () => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [contentType, setContentType] = useState("ግዕዝ");
  const [writtenBy, setWrittenBy] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.from("blog_posts").insert([
      {
        title,
        content,
        content_type: contentType,
        written_by: writtenBy,
      },
    ]);

    if (error) {
      console.error("Error adding blog post:", error);
      setMessage("An error occurred while adding the blog post.");
    } else {
      setMessage("Blog post added successfully!");
      setTitle("");
      setContent("");
      setContentType("ግዕዝ");
      setWrittenBy("");
    }

    setLoading(false);
  };

  return (
<div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-6">
  <div className="w-full max-w-2xl bg-white shadow-lg rounded-lg p-8 mt-16"> {/* Added `mt-16` */}
    <h1 className="text-3xl font-bold text-yellow-600 mb-6 text-center">
      Add New Blog Post
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
          placeholder="Enter the blog title"
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
          placeholder="Write the blog content here..."
        ></textarea>
      </div>
      <div className="mb-6">
        <label htmlFor="contentType" className="block text-gray-700 font-medium mb-2">
          Content Type
        </label>
        <select
          id="contentType"
          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
          value={contentType}
          onChange={(e) => setContentType(e.target.value)}
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
        <label htmlFor="writtenBy" className="block text-gray-700 font-medium mb-2">
          Written By
        </label>
        <input
          type="text"
          id="writtenBy"
          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
          value={writtenBy}
          onChange={(e) => setWrittenBy(e.target.value)}
          required
          placeholder="Author's name"
        />
      </div>
      <button
        type="submit"
        className={`w-full text-white font-medium rounded-lg px-4 py-2 ${
          loading ? "bg-gray-400 cursor-not-allowed" : "bg-yellow-500 hover:bg-yellow-600"
        }`}
        disabled={loading}
      >
        {loading ? "Adding..." : "Add Blog Post"}
      </button>
    </form>
  </div>
</div>

  );
};

export default AddBlogPost;
