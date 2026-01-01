import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import NavBar from "./components/BeteQnie/NavBar";
import Home from "./components/Home";
import AddWordPage from "./components/Admin/AddWord";
import UpdateWordPage from "./components/Admin/UpdateWord";
import Dictionary from "./components/BeteQnie/Dictionary";
import DictionaryGame from "./components/BeteQnie/DictionaryGame";
import AddBlogPost from "./components/Admin/AddBlogPost";
import BlogList from "./components/BeteQnie/BlogList";
import BlogListEdit from "./components/Admin/BlogListEdit";
import UpdateBlogPost from "./components/Admin/UpdateBlogPost";
import DictionaryEdit from "./components/Admin/DictionaryEdit";
import AdminDashboard from "./components/Admin/AdminDashboard";

function App() {
  return (
    <BrowserRouter>
      <div className="App">
        <NavBar />
        <div className="content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dictionary" element={<Dictionary />} />
            <Route path="/add-word" element={<AddWordPage />} />
            <Route path="/update-word/:id" element={<UpdateWordPage />} />
            <Route path="/game" element={<DictionaryGame />} />
            <Route path="/blog" element={<BlogList />} />
            <Route path="/blogEdit" element={<BlogListEdit />} />
            <Route path="/add-blog" element={<AddBlogPost />} />
            <Route path="/update-blog/:id" element={<UpdateBlogPost />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/dictionaryEdit" element={<DictionaryEdit />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
