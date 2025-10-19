import React, { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth, db } from "../configs/firebase-config";
import { Link } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");


  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

 
  const checkEmailExistsInConsultants = async (email) => {
    try {
      const consultantsRef = collection(db, "consultants");
      const q = query(consultantsRef, where("email", "==", email.toLowerCase().trim()));
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty; // Returns true if email exists, false if not
    } catch (err) {
      console.error("Error checking email in Firestore:", err);
      throw new Error("Unable to verify email. Please try again.");
    }
  };

  // Real-time email validation
  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);

    // Clear previous errors when user starts typing
    if (emailError) {
      setEmailError("");
    }
    if (error) {
      setError("");
    }

    // Basic email format validation
    if (value && !validateEmail(value)) {
      setEmailError("Please enter a valid email address");
    } else {
      setEmailError("");
    }
  };

  // Form validation before submission
  const validateForm = () => {
    let isValid = true;

    // Check if email is empty
    if (!email.trim()) {
      setEmailError("Email is required");
      isValid = false;
    }
    // Check if email format is valid
    else if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address");
      isValid = false;
    }

    return isValid;
  };

  const handleReset = async (e) => {
    e.preventDefault();
    
    // Clear previous messages
    setMessage("");
    setError("");


    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
    
      const emailExists = await checkEmailExistsInConsultants(email);
      
      if (!emailExists) {
        setError("❌ No consultant account found with this email address");
        setLoading(false);
        return;
      }

  
      await sendPasswordResetEmail(auth, email);
      setMessage("✅ Password reset link has been sent to your email. Please check your inbox and spam folder.");
      setError("");
      setEmail(""); 
    } catch (err) {
      let errorMessage = "❌ An error occurred while sending reset email";
      
      
      switch (err.code) {
        case "auth/invalid-email":
          errorMessage = "❌ Please enter a valid email address";
          break;
        case "auth/user-not-found":
          errorMessage = "❌ No account found with this email address";
          break;
        case "auth/network-request-failed":
          errorMessage = "❌ Network error. Please check your connection";
          break;
        default:
          // Check if it's our custom Firestore error
          if (err.message.includes("Unable to verify email")) {
            errorMessage = `❌ ${err.message}`;
          } else {
            errorMessage = `❌ ${err.message}`;
          }
      }
      
      setError(errorMessage);
      setMessage("");
    } finally {
      setLoading(false);
    }
  };

  // Check if form can be submitted
  const canSubmit = email.trim() && validateEmail(email) && !loading;

  return (
    <div className="w-full min-h-screen flex flex-col justify-center items-center bg-gradient-to-b from-white to-[#F2C2DE] px-6">
      <div className="bg-white rounded-2xl shadow-lg p-10 w-full max-w-md space-y-6">
        <h2 className="text-2xl font-bold text-center text-gray-800">
          Forgot Password?
        </h2>
        <p className="text-sm text-gray-600 text-center">
          Enter your registered consultant email address and we'll send you a link to reset
          your password.
        </p>

        <form onSubmit={handleReset} className="space-y-4" noValidate>
          <div className="space-y-2">
            <input
              type="email"
              placeholder="Enter your consultant email"
              value={email}
              onChange={handleEmailChange}
              required
              disabled={loading}
              className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-colors ${
                emailError 
                  ? "border-red-500 focus:ring-red-500" 
                  : "border-[#DA79B9] focus:ring-[#DA79B9]"
              } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
            />
            {emailError && (
              <p className="text-red-500 text-xs mt-1">{emailError}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className={`w-full py-3 rounded-xl font-semibold shadow transition-colors ${
              canSubmit
                ? "bg-[#DA79B9] text-white hover:bg-[#c965a5] cursor-pointer"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Verifying...
              </span>
            ) : (
              "Send Reset Link"
            )}
          </button>
        </form>

        {message && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-700 text-sm text-center">{message}</p>
          </div>
        )}
        
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm text-center">{error}</p>
          </div>
        )}

        <div className="text-center pt-4">
          <Link 
            to="/login" 
            className="text-sm text-[#DA79B9] underline hover:text-[#c965a5] transition-colors"
          >
            Back to Login
          </Link>
        </div>

        {/* Additional info for consultants */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-700 text-xs text-center">
            <strong>Note:</strong> This reset link is only for consultant accounts. 
            If you don't have a consultant account, please contact your administrator.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;