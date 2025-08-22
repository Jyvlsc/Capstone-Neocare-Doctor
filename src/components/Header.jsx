import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { auth, db } from "../configs/firebase-config";
import { doc, getDoc } from "firebase/firestore";
import Logo from "../assets/Logo.png";

// All possible links
const ALL_LINKS = [
  ["/dashboard", "Dashboard"],
  ["/clients",   "Clients"],
  ["/requests",  "Requests"],
  ["/profile",   "Profile"],
  ["/chat",      "Chat"],
];

const Header = () => {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState(null);

  // Load user role
  useEffect(() => {
    const u = auth.currentUser;
    if (!u) return;
    getDoc(doc(db, "users", u.uid))
      .then((snap) => {
        if (snap.exists()) {
          setRole(snap.data().role);
        }
      })
      .catch(console.error);
  }, []);

  const handleLogout = async () => {
    await auth.signOut();
    nav("/");
  };

  // Filter links based on role
  const linksToShow = role === "staff"
    ? ALL_LINKS.filter(([href]) => href === "/clients")
    : ALL_LINKS;

  const linkClass = (href) =>
    `font-mono text-sm font-medium transition-colors py-2 md:py-0 ${
      pathname.startsWith(href)
        ? "text-[#DA79B9] border-b-2 border-[#DA79B9] md:border-none"
        : "text-gray-800 hover:text-[#DA79B9]"
    }`;

  return (
    <header className="fixed top-0 left-0 w-full h-16 flex items-center px-6 z-50
                       bg-white/70 backdrop-blur-md border-b-2 border-[#DA79B9] shadow-sm">
      {/* Brand */}
      <Link to="/landing" className="flex items-center gap-2 mr-6">
        <img src={Logo} alt="NeoCare logo" className="w-9 h-9" />
        <span className="text-2xl font-mono font-extrabold text-[#DA79B9]">
          NeoCare
        </span>
      </Link>

      {/* Hamburger (mobile) */}
      <button
        className="md:hidden ml-auto text-gray-800 focus:outline-none"
        onClick={() => setOpen(!open)}
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d={
              open
                ? "M6 18L18 6M6 6l12 12"
                : "M4 6h16M4 12h16M4 18h16"
            }
          />
        </svg>
      </button>

      {/* Navigation links */}
      <nav
        className={`flex-col md:flex-row md:flex items-center md:gap-8 absolute md:static
                    top-16 left-0 w-full md:w-auto bg-white/90 backdrop-blur-md md:bg-transparent
                    ${open ? "flex" : "hidden md:flex"}`}
      >
        {linksToShow.map(([href, label]) => (
          <Link
            key={href}
            to={href}
            onClick={() => setOpen(false)}
            className={linkClass(href)}
          >
            {label}
          </Link>
        ))}
      </nav>

      {/* User & Logout */}
      <div className="ml-auto hidden md:flex items-center gap-4">
        <span className="font-mono text-sm text-gray-600">
          {auth.currentUser?.email ?? "Guest"}
        </span>
        <button
          onClick={handleLogout}
          className="font-mono text-sm font-medium text-gray-800 hover:text-[#DA79B9] transition-colors"
        >
          Logout
        </button>
      </div>
    </header>
  );
};

export default Header;
