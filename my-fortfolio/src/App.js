import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Home from "./components/Home";
import AddWordPage from "./components/dictionary/AddWord";
import UpdateWordPage from "./components/dictionary/UpdateWord";
import Dictionary from "./components/dictionary/Dictionary";
import DictionaryGame from "./components/dictionary/DictionaryGame";
import AddBlogPost from "./components/BeteQnie/AddBlogPost";
import BlogList from "./components/BeteQnie/BlogList";
import BlogListEdit from "./components/BeteQnie/BlogListEdit";
import UpdateBlogPost from "./components/BeteQnie/UpdateBlogPost";
import DictionaryEdit from "./components/dictionary/DictionaryEdit";
import AdminDashboard from "./components/AdminDashboard";

function App() {
  return (
    <BrowserRouter>
      <div className="App">
        <NavBar />
        <div className="content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/hobby" element={<Hobby />} />
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
