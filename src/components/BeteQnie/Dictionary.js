import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import { FaSearch } from "react-icons/fa";
import { supabase } from "../../util/supabaseClient";

function Dictionary() {
  const [query, setQuery] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("gz"); // Default to Ge'ez
  const [languages, setLanguages] = useState([]);
  const [results, setResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [sewasewExamples, setSewasewExamples] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
        .ilike("word", `${value}%`) // Match words starting with the input
        .limit(5); // Limit suggestions to 5

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
      // Fetch translations
      const { data: translationData, error: translationError } = await supabase.rpc(
        "get_translations",
        {
          search_word: query.trim(), // Removed wildcards
          language: selectedLanguage,
        }
      );

      if (translationError) {
        setError("Failed to fetch data. Please try again.");
        console.error(translationError);
      } else {
        setResults(translationData);
      }

      // Fetch Sewasew examples if the searched language is Ge'ez
      if (selectedLanguage === "gz") {
        const { data: sewasewData, error: sewasewError } = await supabase
          .from("sewasew")
          .select("sewasew_text")
          .in(
            "word_id",
            translationData.map((item) => item.word_id) // Use the word IDs from the results
          );

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

  return (
    <div className="flex h-screen w-full min-h-screen flex-col items-center justify-center bg-gradient-to-b from-gray-100 to-gray-200 p-4 pt-24">
      <Helmet>
        <title>Geez Dictionary | Tigrigna | Amharic | ግእዝ | ትግርኛ | አምሓርኛ| ቅኔ| መጽሐፈግስ| ወስዋስው</title>
        <meta
          name="description"
          content="Search Ge'ez, Tigrinya, and Amharic words with translations. Find words like ግስ, ስዋስው, ቅኔ and more in this dictionary."
        />
        <meta
          name="keywords"
          content="Geez dictionary, Tigrigna dictionary, Amharic dictionary, ግእዝ, ትግርኛ, አምሓርኛ, ግስ, ስዋስው, ቅኔ, መጽሐፈግስ"
        />
        <meta name="author" content="Geez Dictionary " />
        <link rel="canonical" href="https://yourwebsite.com/dictionary" />
      </Helmet>
      <h1 className="text-4xl font-bold text-yellow-800 mb-6">Dictionary</h1>

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
        className="mt-4 w-full max-w-lg bg-yellow-800 text-white py-3 rounded-lg shadow-lg hover:bg-yellow-700"
      >
        Search
      </button>

      {/* Loading and Error Messages */}
      {loading && <p className="text-gray-500 mt-4">Loading...</p>}
      {error && <p className="text-red-500 mt-4">{error}</p>}

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
          </div>
        ) : (
          !loading && query.trim() && (
            <p className="text-gray-500 mt-4">No results found.</p>
          )
        )}
      </div>

      {/* Sewasew Section */}
      {sewasewExamples.length > 0 && (
        <div className="mt-8 w-full max-w-3xl">
          <div className="p-6 border rounded-lg shadow-xl bg-white">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Sewasew:</h2>
            <ul className="list-disc pl-6">
              {sewasewExamples.map((example, index) => (
                <li key={index} className="text-gray-700 mb-2">
                  {example.sewasew_text}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dictionary;
