import React from "react";
import Header from "../components/Header";
import Babyhead from "../assets/Babyhead.png";
import Question from "../assets/Question.png";

const LandingPage = () => {
  return (
    <div className="w-full min-h-screen flex flex-col items-center bg-gradient-to-b from-white to-[#F2C2DE]">
      <Header />

      {/* ---------------- Combined Section ---------------- */}
      <section className="w-full min-h-screen flex flex-col lg:flex-row items-center justify-between gap-12 px-6 py-12 max-w-7xl mx-auto">
        {/* Left side - Welcome content */}
        <div className="flex-1 flex flex-col justify-center space-y-8 max-w-2xl">
          <div className="space-y-6">
            <h1 className="text-5xl font-bold text-gray-900 leading-tight">
              Welcome to NeoCare<br />Consultant Portal
            </h1>
            <p className="text-2xl text-[#DA79B9] font-light leading-relaxed">
              Empowering parents through expert guidance and support
            </p>
          </div>
          <p className="text-lg text-gray-700 leading-8">
            NeoCare is a trusted resource for new parents, offering expert advice and
            support that feels like having a personal parenting coach — while remaining
            accessible and affordable for every family.
          </p>
        </div>

        {/* Right side - Mission & Role cards */}
        <div className="flex-1 flex flex-col justify-center items-center lg:items-end gap-6 max-w-lg">
          {/* Our Mission Card */}
          <div className="bg-white rounded-2xl p-8 w-full shadow-xl space-y-6 border border-gray-100 hover:shadow-2xl transition-all duration-300">
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-gradient-to-br from-[#F2C2DE] to-[#DA79B9] rounded-full flex items-center justify-center">
                <img src={Question} alt="Mission" className="w-10 h-10 filter brightness-0 invert" />
              </div>
            </div>
            <h4 className="text-2xl font-semibold text-gray-900 text-center">
              Our Mission
            </h4>
            <p className="text-gray-600 text-center leading-7">
              At NeoCare, we're dedicated to providing comprehensive support to parents, 
              fostering healthier families and happier children. Our platform empowers 
              consultants like you to make a meaningful difference in the lives of families 
              around the world.
            </p>
          </div>

          {/* Your Role Card */}
          <div className="bg-white rounded-2xl p-8 w-full shadow-xl space-y-6 border border-gray-100 hover:shadow-2xl transition-all duration-300">
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-gradient-to-br from-[#F2C2DE] to-[#DA79B9] rounded-full flex items-center justify-center">
                <img src={Question} alt="Role" className="w-10 h-10 filter brightness-0 invert" />
              </div>
            </div>
            <h4 className="text-2xl font-semibold text-gray-900 text-center">
              Your Role
            </h4>
            <p className="text-gray-600 text-center leading-7">
              As a NeoCare consultant, you play a crucial role in shaping the future of 
              families and communities. Your expertise and guidance help parents navigate 
              the challenges of raising children, promoting positive parenting practices, 
              and fostering healthy child development.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;