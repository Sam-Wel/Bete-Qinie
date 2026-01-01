import React from "react";
import About from "./BeteQnie/About";

const Home = () => {
  return (
    <div className="pt-32 bg-dark-brown">
      <div
        id="home"
        className="flex items-center h-screen w-full  text-white justify-center pt-2 md:pt-0 mb-5"
      >
      <About />


      </div>
    </div>
  );
};

export default Home;
