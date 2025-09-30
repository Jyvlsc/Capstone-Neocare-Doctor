import React, { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../configs/firebase-config";
import { Link } from "react-router-dom";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleReset = async (e) => {
    e.preventDefault();
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage("✅ Password reset link has been sent to your email.");
      setError("");
    } catch (err) {
      setError("❌ " + err.message);
      setMessage("");
    }
  };

  return (
    <div className="w-full min-h-screen flex flex-col justify-center items-center bg-gradient-to-b from-white to-[#F2C2DE] px-6">
      <div className="bg-white rounded-2xl shadow-lg p-10 w-full max-w-md space-y-6">
        <h2 className="text-2xl font-bold text-center text-gray-800">
          Forgot Password?
        </h2>
        <p className="text-sm text-gray-600 text-center">
          Enter your registered email address and we’ll send you a link to reset
          your password.
        </p>

        <form onSubmit={handleReset} className="space-y-4">
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 border border-[#DA79B9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#DA79B9]"
          />
          <button
            type="submit"
            className="w-full bg-[#DA79B9] text-white py-3 rounded-xl font-semibold shadow hover:bg-[#c965a5] transition-colors"
          >
            Send Reset Link
          </button>
        </form>

        {message && (
          <p className="text-green-600 text-sm text-center">{message}</p>
        )}
        {error && <p className="text-red-600 text-sm text-center">{error}</p>}

        <div className="text-center">
          <Link to="/login" className="text-sm text-[#DA79B9] underline">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
