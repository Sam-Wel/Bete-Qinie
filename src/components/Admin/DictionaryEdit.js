import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import { FaSearch } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../util/supabaseClient";

function DictionaryEdit() {
  const [query, setQuery] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("gz"); // Default to Ge'ez
  const [languages, setLanguages] = useState([]);
  const [results, setResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [sewasewExamples, setSewasewExamples] = useState([]);
  const [loading, setLoading] = useState(false);
  const [, setError] = useState(null);
  const navigate = useNavigate();

  // Fetch available languages
  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        const { data, error } = await supabase.from("languages").select("*");
        if (error) {
          console.error("Error fetching languages:", error);
        } else {
          setLanguages(data);
        }
      } catch (err) {
        console.error("Unexpected error:", err);
      }
    };

    fetchLanguages();
  }, []);

  // Map language codes to language names
  const languageMap = languages.reduce((map, lang) => {
    map[lang.language_code] = lang.language_name;
    return map;
  }, {});

  // Fetch suggestions as the user types
  const fetchSuggestions = async (value) => {
    if (!value.trim() || !selectedLanguage) {
      setSuggestions([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("words")
        .select("word")
        .eq("language_code", selectedLanguage)
        .ilike("word", `${value}%`)
        .limit(5);

      if (error) {
        console.error("Error fetching suggestions:", error);
      } else {
        setSuggestions(data.map((item) => item.word));
      }
    } catch (err) {
      console.error("Unexpected error fetching suggestions:", err);
    }
  };

  const handleSearch = async () => {
    if (!query.trim() || !selectedLanguage) {
      setError("Please enter a search term and select a language.");
      return;
    }

    setLoading(true);
    setError(null);
    setSewasewExamples([]);
    setResults([]);

    try {
      const { data: translationData, error: translationError } = await supabase.rpc(
        "get_translations",
        {
          search_word: query.trim(),
          language: selectedLanguage,
        }
      );

      if (translationError) {
        setError("Failed to fetch data. Please try again.");
        console.error(translationError);
      } else {
        setResults(translationData);
      }

      if (selectedLanguage === "gz" && translationData.length > 0) {
        const { data: sewasewData, error: sewasewError } = await supabase
          .from("sewasew")
          .select("sewasew_id, sewasew_text")
          .in("word_id", translationData.map((item) => item.word_id));

        if (sewasewError) {
          console.error("Error fetching Sewasew examples:", sewasewError);
        } else {
          setSewasewExamples(sewasewData);
        }
      }
    } catch (err) {
      setError("An unexpected error occurred.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditSewasew = async (id, newText) => {
    try {
      const { error } = await supabase
        .from("sewasew")
        .update({ sewasew_text: newText })
        .eq("sewasew_id", id);

      if (error) {
        console.error("Error updating Sewasew example:", error);
      } else {
        setSewasewExamples((prev) =>
          prev.map((example) =>
            example.sewasew_id === id ? { ...example, sewasew_text: newText } : example
          )
        );
      }
    } catch (err) {
      console.error("Unexpected error updating Sewasew example:", err);
    }
  };

  const handleEditClick = () => {
    if (results.length > 0) {
      navigate(`/update-word/${results[0].word_id}`, {
        state: { wordId: results[0].word_id },
      });
    } else {
      setError("No results to edit.");
    }
  };

  return (
    <div className="flex h-screen w-full min-h-screen flex-col items-center justify-center bg-gradient-to-b from-gray-100 to-gray-200 p-4 pt-24">
      <Helmet>
        <title>Edit Dictionary | Ge'ez | Tigrigna | Amharic</title>
        <meta
          name="description"
          content="Edit dictionary entries for Ge'ez, Tigrinya, and Amharic words."
        />
        <link rel="canonical" href="https://yourwebsite.com/dictionary/edit" />
      </Helmet>
      <h1 className="text-4xl font-bold text-yellow-700 mb-6">Edit Dictionary</h1>

      {/* Language Selection Dropdown */}
      <div className="mb-4 w-full max-w-lg">
        <label className="block text-gray-600 mb-2 text-lg">Select Language:</label>
        <select
          value={selectedLanguage}
          onChange={(e) => setSelectedLanguage(e.target.value)}
          className="w-full p-3 border rounded-lg shadow-sm focus:outline-none focus:ring focus:border-yellow-400"
        >
          {languages.map((language) => (
            <option key={language.language_code} value={language.language_code}>
              {language.language_name}
            </option>
          ))}
        </select>
      </div>

      {/* Search Bar */}
      <div className="w-full max-w-lg">
        <div className="flex items-center border rounded-lg shadow-sm w-full relative">
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              fetchSuggestions(e.target.value);
            }}
            placeholder="Enter a word to search..."
            className="w-full p-4 pl-12 text-lg rounded-lg focus:outline-none focus:ring focus:border-yellow-400"
          />
          <FaSearch className="absolute left-4 text-yellow-500 text-xl" />
        </div>
        {suggestions.length > 0 && (
          <ul className="absolute bg-white border rounded-lg shadow-lg mt-2 w-full z-10">
            {suggestions.map((suggestion, index) => (
              <li
                key={index}
                className="p-2 hover:bg-gray-100 cursor-pointer"
                onClick={() => {
                  setQuery(suggestion);
                  setSuggestions([]);
                }}
              >
                {suggestion}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Search Button */}
      <button
        onClick={handleSearch}
        className="mt-4 w-full max-w-lg bg-yellow-600 text-white py-3 rounded-lg shadow-lg hover:bg-yellow-700"
      >
        Search
      </button>

      {/* Results Display */}
      <div className="mt-8 w-full max-w-3xl">
        {results.length > 0 ? (
          <div className="p-6 border rounded-lg shadow-xl bg-white">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Results:</h2>
            <table className="table-auto w-full text-left">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="p-2 text-yellow-600">Language</th>
                  <th className="p-2 text-yellow-600">Translations</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(
                  results.reduce((acc, result) => {
                    const lang =
                      languageMap[result.target_language] || result.target_language;
                    if (!acc[lang]) acc[lang] = [];
                    acc[lang].push(result.translated_word);
                    return acc;
                  }, {})
                ).map(([language, words], index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="p-2 font-medium text-gray-700">{language}</td>
                    <td className="p-2 text-gray-700">
                      {words.join(language === "ኢንግልሽ - English" ? ", " : "፣")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              onClick={handleEditClick}
              className="mt-6 w-full bg-yellow-600 text-white py-3 rounded-lg shadow-lg hover:bg-yellow-700"
            >
              Edit Result
            </button>
          </div>
        ) : (
          !loading && query.trim() && (
            <p className="text-gray-500 mt-4">No results found.</p>
          )
        )}

        {/* Sewasew Section */}
        {sewasewExamples.length > 0 && (
          <div className="mt-8 w-full max-w-3xl">
            <div className="p-6 border rounded-lg shadow-xl bg-white">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Sewasew Examples:</h2>
              {sewasewExamples.map((example) => (
                <div key={example.sewasew_id} className="flex items-center mb-4">
                  <input
                    type="text"
                    value={example.sewasew_text}
                    onChange={(e) =>
                      handleEditSewasew(example.sewasew_id, e.target.value)
                    }
                    className="flex-grow p-2 border rounded-lg shadow-sm focus:outline-none focus:ring focus:border-yellow-400"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DictionaryEdit;
