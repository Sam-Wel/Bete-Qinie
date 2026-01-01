import React from "react";
import { useNavigate } from "react-router-dom";

const AdminDashboard = () => {
  const navigate = useNavigate();

  const links = [
    { name: "Add Blog Post", path: "/add-blog" },
    { name: "Add Dictionary Word", path: "/add-word" },
    { name: "Manage Dictionary", path: "/dictionaryEdit" },
    { name: "Manage Blog posts", path: "/blogEdit" },
  ];

  return (
    <div className="bg-dark-yellow text-white min-h-screen flex items-center justify-center px-8">
      <div className="w-full max-w-4xl bg-white shadow-lg rounded-lg p-8">
        <h1 className="text-4xl font-bold text-yellow-600 mb-6 text-center">
          Admin Dashboard
        </h1>
        <p className="text-gray-700 text-lg mb-8 text-center">
          Welcome, Admin! Manage your application below.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {links.map((link, index) => (
            <div
              key={index}
              className="border border-gray-300 rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 text-center"
            >
              <button
                onClick={() => navigate(link.path)}
                className="text-yellow-600 font-semibold hover:underline"
              >
                {link.name}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
