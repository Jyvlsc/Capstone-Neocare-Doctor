import React from "react";
import Header from "../components/Header";
import Babyhead from "../assets/Babyhead.png";
import Question from "../assets/Question.png";

const LandingPage = () => {
  return (
    <div className="w-full min-h-screen flex flex-col items-center bg-gradient-to-b from-white to-[#F2C2DE]">
      <Header />

      {/* ---------------- First Section ---------------- */}
      <section className="w-full min-h-screen flex justify-center items-center px-6 py-20 bg-gradient-to-b from-white to-[#F2C2DE]/40">
        <div className="bg-white/90 backdrop-blur-md shadow-lg rounded-3xl max-w-3xl w-full p-10 md:p-16 text-center space-y-8 transform transition duration-300 hover:shadow-2xl hover:-translate-y-1">
          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-800 leading-snug">
            Welcome to <span className="text-[#DA79B9]">NeoCare</span>{" "}
            Consultant Portal
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-[#DA79B9] font-light">
            Empowering parents through expert guidance and support
          </p>

          {/* Description */}
          <p className="text-base md:text-lg text-gray-700 leading-relaxed">
            NeoCare is a trusted resource for new parents, offering expert
            advice and support that feels like having a personal parenting coach
            — at just a fraction of the cost.
          </p>
        </div>
      </section>

      {/* ---------------- Dashboard Section ---------------- */}
      <section className="w-full bg-white py-20 px-6">
        <div className="text-center mb-12 space-y-4">
          <h2 className="text-3xl md:text-4xl text-[#DA79B9] font-light">
            Dashboard
          </h2>
          <h3 className="text-4xl md:text-5xl font-bold text-gray-800">
            Your Impact Dashboard
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 justify-items-center">
          {[
            ["150+", "Families Supported"],
            ["98%", "Client Satisfaction"],
            ["500+", "Consultations Given"],
            ["25+", "Years Combined Experience"],
          ].map(([value, label]) => (
            <div
              key={label}
              className="w-64 h-64 bg-[#F5EFE8] rounded-2xl p-6 flex flex-col justify-center items-start relative shadow-md hover:shadow-xl transition-shadow duration-300"
            >
              <img
                src={Babyhead}
                alt=""
                className="w-12 h-12 absolute top-4 left-4 opacity-80"
              />
              <span className="mt-10 text-4xl font-mono font-semibold text-[#DA79B9]">
                {value}
              </span>
              <span className="text-lg md:text-xl text-gray-800 font-medium mt-2">
                {label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- Mission & Role Section ---------------- */}
      <section className="w-full py-20 px-6 bg-gradient-to-br from-[#F5EFE8] to-[#F2C2DE] flex flex-col md:flex-row justify-center items-center gap-10">
        {[
          [
            "Our Mission",
            "At NeoCare, we're dedicated to providing comprehensive support to parents, fostering healthier families and happier children. Our platform empowers consultants like you to make a meaningful difference in the lives of families around the world.",
          ],
          [
            "Your Role",
            "As a NeoCare consultant, you play a crucial role in shaping the future of families and communities. Your expertise and guidance help parents navigate the challenges of raising children, promoting positive parenting practices, and fostering healthy child development.",
          ],
        ].map(([title, text]) => (
          <div
            key={title}
            className="bg-white rounded-2xl p-10 w-full max-w-md shadow-md hover:shadow-xl transition-transform transform hover:-translate-y-2 duration-300 space-y-6"
          >
            <div className="flex justify-center">
              <img src={Question} alt="" className="w-16 h-16 opacity-90" />
            </div>
            <h4 className="text-2xl md:text-3xl font-mono font-semibold text-[#DA79B9] text-center">
              {title}
            </h4>
            <p className="text-gray-700 text-center leading-relaxed">{text}</p>
          </div>
        ))}
      </section>
    </div>
  );
};

export default LandingPage;
