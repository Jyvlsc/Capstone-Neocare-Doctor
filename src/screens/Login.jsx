import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth, db } from "../configs/firebase-config";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import Logo from "../assets/Logo.png";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const login = async () => {
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
      alert("Login failed: " + e.message);
    }
  };

  return (
    <>
      {/* uses the same white→pink gradient background as Register.jsx */}
      <div className="w-full min-h-screen flex flex-col items-center justify-start pt-16 bg-gradient-to-b from-white to-[#F2C2DE] p-4">
        {/* logo + title */}
        <div className="flex flex-col items-center text-center gap-3 w-[800px]">
          <div className="flex items-center justify-center mb-6">
            <img src={Logo} alt="NeoCare logo" className="w-24 h-24" />
            <span className="ml-3 text-5xl font-extrabold font-mono text-[#DA79B9]">
              NeoCare
            </span>
          </div>

          <h1 className="font-bold text-6xl text-gray-900">
            Launch your professionality
            <span className="text-[#DA79B9]"> chapter </span>
            as a healthcare professional
          </h1>
        </div>

        {/* quote */}
        <div className="w-[600px] text-center mt-6">
          <p className="font-medium text-lg font-mono text-gray-800">
            "Making the decision to have a child is momentous. It is to decide
            forever to have your heart go walking around outside your body."
            <br />— Elizabeth Stone
          </p>
        </div>

        {/* form card */}
        <div className="w-[600px] p-8 flex flex-col gap-4 bg-white rounded-xl shadow-lg mt-6">
          <label className="font-medium text-gray-800">Email</label>
          <input
            type="email"
            placeholder="Enter Email"
            className="w-full h-10 rounded-xl border border-[#DA79B9] px-4 focus:outline-none focus:ring-2 focus:ring-[#DA79B9]"
            onChange={(e) => setEmail(e.target.value)}
          />

          <label className="font-medium text-gray-800">Password</label>
          <input
            type="password"
            placeholder="Enter Password"
            className="w-full h-10 rounded-xl border border-[#DA79B9] px-4 focus:outline-none focus:ring-2 focus:ring-[#DA79B9]"
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") login();
            }}
          />

          <button
            onClick={login}
            className="w-full h-10 rounded-xl bg-[#DA79B9] text-white font-medium text-xl mt-5 font-mono hover:bg-[#C064A0] transition-colors"
          >
            SIGN IN
          </button>

          <div className="w-full flex justify-end">
            <Link className="font-medium text-sm font-mono underline text-[#DA79B9]">
              Forgot Password?
            </Link>
          </div>
        </div>

        {/* footer links */}
        <div className="flex flex-col items-center gap-3 mt-6">
         
          <span className="text-gray-800"> 
            Don't have an account?{" "}
            <Link to="/register" className="underline text-[#DA79B9]">
              Sign Up!
            </Link>
          </span>
        </div>
      </div>
    </>
  );
};

export default Login;