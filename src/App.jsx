import { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import "./App.css";

/* screens */
import LandingPage from "./screens/LandingPage";
import Dashboard from "./screens/Dashboard";
import Forum from "./screens/Forum";
import Login from "./screens/Login";
import Register from "./screens/Register";
import Requests from "./screens/Requests";
import Clients from "./screens/Clients";
import ChatPage from "./screens/ChatPage";
import ChatComponent from "./components/ChatComponent";
import AddConsultationNote from "./screens/AddConsultationNote";
import ClientDetails from "./screens/ClientDetails";
import Profile from "./screens/Profile";
import ForgotPassword from "./screens/ForgotPassword.jsx"; 


/* firebase */
import { auth } from "./configs/firebase-config";

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      setAuthReady(true);
    });
    return unsubscribe;
  }, []);

  const PrivateRoute = ({ children }) => {
    return currentUser ? children : <Navigate to="/" replace />;
  };

  if (!authReady) {
    return <div className="loading-screen">Checking authentication...</div>;
  }

  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Protected routes */}
        <Route path="/landing" element={<PrivateRoute><LandingPage /></PrivateRoute>} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/forum" element={<PrivateRoute><Forum /></PrivateRoute>} />
        <Route path="/requests" element={<PrivateRoute><Requests /></PrivateRoute>} />
        <Route path="/clients" element={<PrivateRoute><Clients /></PrivateRoute>} />
        <Route path="/clients/add-consultation-note/:id" element={<PrivateRoute><AddConsultationNote /></PrivateRoute>} />
        <Route path="/clients/:id" element={<PrivateRoute><ClientDetails /></PrivateRoute>} />
        <Route path="/chat" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
        <Route path="/chat/:chatId" element={<PrivateRoute><ChatComponent /></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />

        {/* Catch-all fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
