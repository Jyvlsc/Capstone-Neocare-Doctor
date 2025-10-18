/* src/screens/Dashboard.jsx */
import React, { useEffect, useState } from "react";
import {
  collection, query, where, onSnapshot, getDocs,
  orderBy, limit
} from "firebase/firestore";
import { db, auth } from "../configs/firebase-config";
import Header from "../components/Header";

const Dashboard = () => {
  const doctor = auth.currentUser;

  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState(0);
  const [pendingApt, setPendingApt] = useState(0);
  const [unreadMsgs, setUnreadMsgs] = useState(0);
  const [stats, setStats] = useState({
    patients: 0,
    pendingApt: 0,
    unreadMsgs: 0,
    satisfactionRate: "98%"
  });

  /* ─── fetch counts with real-time updates ─── */
  useEffect(() => {
    if (!doctor) return;

    const unsubscribeFunctions = [];

    /* Active patients = clients where consultantId == doctor.uid */
    const unsubClients = onSnapshot(
      query(collection(db, "clients"), where("consultantId", "==", doctor.uid)),
      (snap) => {
        setPatients(snap.size);
        setStats(prev => ({ ...prev, patients: snap.size }));
      }
    );
    unsubscribeFunctions.push(unsubClients);

    /* Pending appointments */
    const unsubReq = onSnapshot(
      query(
        collection(db, "bookings"),
        where("consultantId", "==", doctor.uid),
        where("status", "==", "pending")
      ),
      (snap) => {
        setPendingApt(snap.size);
        setStats(prev => ({ ...prev, pendingApt: snap.size }));
      }
    );
    unsubscribeFunctions.push(unsubReq);

    /* Unread messages: optimized real-time listener */
    const setupMessagesListener = async () => {
      const chatsQuery = query(
        collection(db, "chats"), 
        where("doctorUid", "==", doctor.uid)
      );
      
      const chatsSnapshot = await getDocs(chatsQuery);
      const chatIds = chatsSnapshot.docs.map(doc => doc.id);

      // Set up listeners for each chat's unread messages
      chatIds.forEach(chatId => {
        const messagesQuery = query(
          collection(db, "chats", chatId, "messages"),
          where("seenByDoctor", "==", false)
        );

        const unsubMessages = onSnapshot(messagesQuery, (snap) => {
  
          let totalUnread = 0;
          chatIds.forEach(async (id) => {
            const msgSnap = await getDocs(
              query(collection(db, "chats", id, "messages"), 
              where("seenByDoctor", "==", false))
            );
            totalUnread += msgSnap.size;
          });
          
          setUnreadMsgs(totalUnread);
          setStats(prev => ({ ...prev, unreadMsgs: totalUnread }));
          setLoading(false);
        });
        unsubscribeFunctions.push(unsubMessages);
      });
    };

    setupMessagesListener();

  

    return () => {
      unsubscribeFunctions.forEach(unsub => unsub());
    };
  }, [doctor]);

  /* Refresh dashboard data */
  const refreshDashboard = async () => {
    setLoading(true);
    // Force re-fetch all data
    if (doctor) {
      // Re-fetch patients count
      const patientsSnap = await getDocs(
        query(collection(db, "clients"), where("consultantId", "==", doctor.uid))
      );
      setPatients(patientsSnap.size);

      // Re-fetch pending appointments
      const pendingSnap = await getDocs(
        query(
          collection(db, "bookings"),
          where("consultantId", "==", doctor.uid),
          where("status", "==", "pending")
        )
      );
      setPendingApt(pendingSnap.size);

      // Re-fetch unread messages
      const chats = await getDocs(
        query(collection(db, "chats"), where("doctorUid", "==", doctor.uid))
      );
      let totalUnread = 0;
      const promises = chats.docs.map(async (c) => {
        const msgs = await getDocs(
          query(
            collection(db, "chats", c.id, "messages"),
            where("seenByDoctor", "==", false)
          )
        );
        totalUnread += msgs.size;
      });
      await Promise.all(promises);
      setUnreadMsgs(totalUnread);
    }
    setLoading(false);
  };

 
  const StatCard = ({ title, value, subtitle, onClick }) => (
    <div 
      className={`bg-white shadow-lg rounded-2xl border-2 border-[#DA79B9] p-6 flex flex-col transition-all duration-300 hover:shadow-xl hover:scale-105 cursor-pointer ${
        onClick ? 'hover:border-[#c43d8b]' : ''
      }`}
      onClick={onClick}
    >
      <span className="text-[#DA79B9] font-bold text-xl mb-2">{title}</span>
      <span className="text-5xl font-semibold text-gray-900 mb-2">{value}</span>
      {subtitle && <span className="text-sm text-gray-600">{subtitle}</span>}
    </div>
  );

  
  

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-gradient-to-b from-white to-[#F2C2DE] flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#DA79B9] mx-auto mb-4"></div>
            <span className="text-xl text-gray-600">Loading dashboard…</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-white to-[#F2C2DE] flex flex-col">
      <Header />

      <main className="flex-1 flex flex-col items-center pt-24 px-4 pb-8">
        <div className="w-full max-w-6xl">
          {/* Header with refresh button */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Dashboard Overview
              </h1>
              </div>
            <button
              onClick={refreshDashboard}
              className="bg-[#DA79B9] text-white px-6 py-2 rounded-lg hover:bg-[#c43d8b] transition-colors duration-300"
            >
              Refresh Data
            </button>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <StatCard 
              title="Active Patients" 
              value={patients} 
              subtitle="Under your care"
            />
            <StatCard 
              title="Pending Appointments" 
              value={pendingApt} 
              subtitle="Awaiting confirmation"
            />
            <StatCard 
              title="New Messages" 
              value={unreadMsgs} 
              subtitle="Unread conversations"
            />
            <StatCard 
              title="Satisfaction Rate" 
              value="98%" 
              subtitle="Client feedback"
            />
          </div>

           <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              Last updated: {new Date().toLocaleTimeString()}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;