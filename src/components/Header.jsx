/* src/screens/Header.jsx */
import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { auth, db } from "../configs/firebase-config";
import { doc, getDoc } from "firebase/firestore";
import Logo from "../assets/Logo.png";

// All possible links with icons
const ALL_LINKS = [
  ["/dashboard", "Dashboard", "📊"],
  ["/clients",   "Clients", "👥"],
  ["/requests",  "Requests", "📋"],
  ["/profile",   "Profile", "👤"],
  ["/chat",      "Chat", "💬"],
];

const Header = () => {
  const nav = useNavigate();
  const { pathname } = useLocation();
  
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState(null);
  const [userData, setUserData] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    
    return () => clearInterval(timer);
  }, []);

  // Load user role and data
  useEffect(() => {
    const u = auth.currentUser;
    if (!u) return;
    
    getDoc(doc(db, "users", u.uid))
      .then((snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setRole(data.role);
          setUserData(data);
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
    `font-mono text-sm font-medium transition-all duration-300 py-2 px-3 rounded-lg md:py-1 flex items-center gap-2 ${
      pathname.startsWith(href)
        ? "text-[#DA79B9] bg-pink-50 border border-[#DA79B9]/20 shadow-sm"
        : "text-gray-700 hover:text-[#DA79B9] hover:bg-gray-50"
    }`;

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <header className="fixed top-0 left-0 w-full h-16 flex items-center px-6 z-50
                       bg-white/80 backdrop-blur-lg border-b border-[#DA79B9]/20 shadow-lg">
      
      {/* Brand with enhanced styling */}
      <Link to="/landing" className="flex items-center gap-3 mr-8 group">
        <img src={Logo} alt="NeoCare logo" className="w-10 h-10 transition-transform group-hover:scale-105" />
        <div className="flex flex-col">
          <span className="text-2xl font-mono font-black text-[#DA79B9] leading-6">
            NeoCare
          </span>
        
        </div>
      </Link>

      {/* Date & Time Display */}
      <div className="hidden lg:flex flex-col items-start mr-8">
        <span className="text-sm font-semibold text-gray-900 font-mono">
          {formatTime(currentTime)}
        </span>
        <span className="text-xs text-gray-500 font-medium">
          {formatDate(currentTime)}
        </span>
      </div>

      {/* Hamburger (mobile) */}
      <button
        className="md:hidden ml-auto text-gray-700 hover:text-[#DA79B9] transition-colors duration-200 p-2 rounded-lg hover:bg-gray-100"
        onClick={() => setOpen(!open)}
        aria-label="Toggle menu"
      >
        <svg
          className="w-6 h-6 transition-transform duration-200"
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

      {/* Navigation links with enhanced styling */}
      <nav
        className={`flex-col md:flex-row md:flex items-center md:gap-2 absolute md:static
                    top-16 left-0 w-full md:w-auto bg-white/95 backdrop-blur-lg md:bg-transparent
                    border-b border-gray-200 md:border-none shadow-lg md:shadow-none
                    ${open ? "flex" : "hidden md:flex"}`}
      >
        {linksToShow.map(([href, label, icon]) => (
          <Link
            key={href}
            to={href}
            onClick={() => setOpen(false)}
            className={linkClass(href)}
            title={label}
          >
            <span className="text-base">{icon}</span>
            <span>{label}</span>
          </Link>
        ))}
      </nav>

      {/* User & Logout with enhanced info */}
      <div className="ml-auto hidden md:flex items-center gap-4">
        
        {/* User Info */}
        <div className="flex flex-col items-end mr-4">
          <span className="font-mono text-sm font-semibold text-gray-900 truncate max-w-[180px]">
            {userData?.name|| auth.currentUser?.name}
          </span>
          <span className="font-mono text-xs text-gray-500 capitalize">
            {role || "User"} • {auth.currentUser?.email || "Guest"}
          </span>
        </div>

        {/* User Avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#DA79B9] to-pink-400 flex items-center justify-center shadow-sm">
          <span className="text-white text-xs font-bold">
            {(userData?.displayName?.[0] || auth.currentUser?.email?.[0] || "U").toUpperCase()}
          </span>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="font-mono text-sm font-semibold text-gray-700 hover:text-[#DA79B9] 
                     transition-all duration-300 hover:bg-gray-100 px-3 py-1.5 rounded-lg
                     border border-transparent hover:border-gray-200"
          title="Logout"
        >
          Logout
        </button>
      </div>

      {/* Mobile user info */}
      {open && (
        <div className="md:hidden absolute top-16 left-0 w-full bg-white/95 backdrop-blur-lg border-b border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#DA79B9] to-pink-400 flex items-center justify-center shadow-sm">
              <span className="text-white text-sm font-bold">
                {(userData?.displayName?.[0] || auth.currentUser?.email?.[0] || "U").toUpperCase()}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-mono text-sm font-semibold text-gray-900">
                {userData?.displayName || auth.currentUser?.email?.split('@')[0] || "User"}
              </span>
              <span className="font-mono text-xs text-gray-500 capitalize">
                {role || "User"}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full font-mono text-sm font-semibold text-gray-700 hover:text-[#DA79B9] 
                       transition-colors duration-200 py-2 rounded-lg border border-gray-200 hover:border-[#DA79B9]/30"
          >
            Sign Out
          </button>
        </div>
      )}
    </header>
  );
};

export default Header;