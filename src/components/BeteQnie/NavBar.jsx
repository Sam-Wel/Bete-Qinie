import React, { useState } from "react";
import {
  FaBars,
  FaTimes
} from "react-icons/fa";
import { scroller } from "react-scroll";
import { useNavigate } from "react-router-dom";

const NavBar = () => {
  const navigate = useNavigate();
  const [nav, setNav] = useState(false);

  const handleNavigation = (link) => {
    if (window.location.pathname !== "/") {
      navigate("/"); // Navigate to Home
      setTimeout(() => scrollToSection(link), 100); // Ensure DOM is ready before scrolling
    } else {
      scrollToSection(link);
    }
    setNav(false); // Close mobile menu
  };

  const scrollToSection = (link) => {
    scroller.scrollTo(link, {
      smooth: true,
      duration: 500,
      offset: -80, // Adjust for fixed navbar height
    });
  };

  const links = [
    { id: 1, label: "Home", link: "home" },
    { id: 2, label: "About", link: "about" },
    { id: 3, label: "Dictionary", path: "/dictionary" },
    { id: 4, label: "Game", path: "/game" },
    { id: 5, label: "ቅኔ አበው", path: "/blog" },
  ];

  return (
    <div className="fixed w-full z-50 bg-yellow-900 shadow-lg">
      {/* Desktop Navbar */}
      <div className="flex justify-between items-center h-20 px-4 text-white">

        {/* Navigation Links */}
        <ul className="hidden md:flex space-x-6">
          {links.map(({ id, label, link, path }) =>
            path ? (
              <li
                key={id}
                onClick={() => navigate(path)}
                className="cursor-pointer hover:text-yellow-400 transition"
              >
                {label}
              </li>
            ) : (
              <li
                key={id}
                onClick={() => handleNavigation(link)}
                className="cursor-pointer hover:text-yellow-400 transition"
              >
                {label}
              </li>
            )
          )}
        </ul>
        {/* Mobile Menu Toggle */}
        <div
          onClick={() => setNav(!nav)}
          className="cursor-pointer md:hidden text-white"
        >
          {nav ? <FaTimes size={30} /> : <FaBars size={30} />}
        </div>

        <div
          onClick={() => {
            navigate("/"); // Navigate to Home page
            scrollToSection("home"); // Scroll to the "home" section
          }}
          className="absolute left-1/2 transform -translate-x-1/2 text-3xl font-bold text-white cursor-pointer"
        >
          ቤተ ቅኔ
        </div>
      </div>

      {/* Mobile Menu */}
      {nav && (
        <div className="fixed inset-0 bg-gradient-to-b from-yellow-900 to-yellow-900 text-white flex flex-col items-center justify-start z-40 overflow-y-auto">
          <div className="w-full flex justify-end px-4 pt-4">
            <FaTimes
              size={30}
              className="cursor-pointer"
              onClick={() => setNav(false)}
            />
          </div>
          <ul className="flex flex-col items-center space-y-6 mt-10 text-xl">
            {links.map(({ id, label, link, path }) =>
              path ? (
                <li
                  key={id}
                  onClick={() => {
                    navigate(path);
                    setNav(false);
                  }}
                  className="cursor-pointer hover:text-yellow-400 transition"
                >
                  {label}
                </li>
              ) : (
                <li
                  key={id}
                  onClick={() => handleNavigation(link)}
                  className="cursor-pointer hover:text-yellow-400 transition"
                >
                  {label}
                </li>
              )
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default NavBar;
