import React from "react";

const About = () => {
  return (
    <div
      id="about"
      className="w-full min-h-screen  text-gray-300 flex flex-col justify-center items-center py-12"
    >
      <div className="max-w-screen-lg text-center px-8">
        <h2
          className="text-5xl font-bold text-yellow-500 border-b-4 border-yellow-900 pb-4"
          style={{ fontFamily: "Raleway, sans-serif" }}
        >
          Welcome to Bete Qinie
        </h2>
        <p
          className="text-lg mt-8 leading-relaxed text-black"
          style={{ fontFamily: "Poppins, sans-serif" }}
        >
          Bete Qinie is your comprehensive Ge'ez, Tigrinya, and Amharic
          dictionary. Whether you're a student, researcher, or language
          enthusiast, our platform provides accurate translations and meanings
          for a wide range of words. Explore the rich linguistic heritage of the
          Horn of Africa with ease and confidence.
        </p>
      </div>
    </div>
  );
};

export default About;
