import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth, db } from "../configs/firebase-config";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import Logo from "../assets/Logo.png";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Validation function
  const validateForm = () => {
    const newErrors = {};

    // Email validation
    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }

    // Password validation
    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const login = async () => {
    // Validate form before proceeding
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      const snap = await getDoc(doc(db, "consultants", user.uid));
      
      if (snap.exists() && snap.data().approvalStatus !== "accepted") {
        alert("Your account is not yet approved. Please wait for clinic approval.");
        await signOut(auth);
        return;
      }
      navigate("/landing");
    } catch (e) {
      console.error("Sign-in error:", e);
      
     
      let errorMessage = "Login failed. Please try again.";
      switch (e.code) {
        case "auth/invalid-email":
          errorMessage = "Invalid email address.";
          setErrors({ ...errors, email: "Invalid email address" });
          break;
        case "auth/user-not-found":
          errorMessage = "No account found with this email.";
          setErrors({ ...errors, email: "No account found with this email" });
          break;
        case "auth/wrong-password":
          errorMessage = "Incorrect password. Please try again.";
          setErrors({ ...errors, password: "Incorrect password" });
          break;
        default:
          errorMessage = e.message || "Login failed. Please try again.";
      }
      
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Clear error when user starts typing
  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (errors.email) {
      setErrors({ ...errors, email: "" });
    }
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (errors.password) {
      setErrors({ ...errors, password: "" });
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      login();
    }
  };

  return (
    <>
      <div className="w-full min-h-screen flex bg-gradient-to-b from-white to-[#F2C2DE] p-4">
        {/* Left side - Branding and content */}
        <div className="flex-1 flex flex-col items-center justify-center">
          {/* logo + title */}
          <div className="flex flex-col items-center text-center gap-6 w-full max-w-[800px] mb-8">
            <div className="flex items-center justify-center">
              <img src={Logo} alt="NeoCare logo" className="w-24 h-24" />
              <span className="ml-3 text-5xl font-extrabold font-mono text-[#DA79B9]">
                NeoCare
              </span>
            </div>

            <h1 className="font-bold text-4xl md:text-5xl lg:text-6xl text-gray-900 leading-tight">
              Launch your professionality
              <span className="text-[#DA79B9]"> chapter </span>
              as a healthcare professional
            </h1>
          </div>

          {/* quote */}
          <div className="w-full max-w-[600px] text-center mb-8">
            <p className="font-medium text-lg font-mono text-gray-800">
              "Making the decision to have a child is momentous. It is to decide
              forever to have your heart go walking around outside your body."
              <br />— Elizabeth Stone
            </p>
          </div>
        </div>

        {/* Right side - Login form */}
        <div className="flex-1 flex flex-col items-center justify-center">
          {/* form card */}
          <div className="w-full max-w-[400px] p-8 flex flex-col gap-4 bg-white rounded-xl shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Welcome Back</h2>
            
            {/* Email Field */}
            <div className="flex flex-col gap-1">
              <label className="font-medium text-gray-800">Email</label>
              <input
                type="email"
                placeholder="Enter Email"
                className={`w-full h-12 rounded-xl border px-4 focus:outline-none focus:ring-2 ${
                  errors.email 
                    ? "border-red-500 focus:ring-red-300" 
                    : "border-[#DA79B9] focus:ring-[#DA79B9]"
                }`}
                value={email}
                onChange={handleEmailChange}
                onKeyDown={handleKeyPress}
                disabled={isLoading}
              />
              {errors.email && (
                <span className="text-red-500 text-sm mt-1">{errors.email}</span>
              )}
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-1">
              <label className="font-medium text-gray-800">Password</label>
              <input
                type="password"
                placeholder="Enter Password"
                className={`w-full h-12 rounded-xl border px-4 focus:outline-none focus:ring-2 ${
                  errors.password 
                    ? "border-red-500 focus:ring-red-300" 
                    : "border-[#DA79B9] focus:ring-[#DA79B9]"
                }`}
                value={password}
                onChange={handlePasswordChange}
                onKeyDown={handleKeyPress}
                disabled={isLoading}
              />
              {errors.password && (
                <span className="text-red-500 text-sm mt-1">{errors.password}</span>
              )}
            </div>

            {/* Login Button */}
            <button
              onClick={login}
              disabled={isLoading}
              className={`w-full h-12 rounded-xl text-white font-medium text-xl mt-2 font-mono transition-colors ${
                isLoading 
                  ? "bg-gray-400 cursor-not-allowed" 
                  : "bg-[#DA79B9] hover:bg-[#C064A0]"
              }`}
            >
              {isLoading ? "SIGNING IN..." : "SIGN IN"}
            </button>

            {/* Forgot Password */}
            <div className="w-full flex justify-end mt-2">
              <Link to="/forgot-password" className="font-medium text-sm font-mono underline text-[#DA79B9] hover:text-[#C064A0] cursor-pointer">
              Forgot Password?
              </Link>
            </div>

            {/* Footer links */}
            <div className="flex flex-col items-center gap-4 mt-4">
              <span className="text-gray-800"> 
                Don't have an account?{" "}
                <Link to="/register" className="underline text-[#DA79B9] hover:text-[#C064A0]">
                  Sign Up!
                </Link>
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;