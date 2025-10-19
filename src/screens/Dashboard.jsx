/* src/screens/Dashboard.jsx */
import React, { useEffect, useState, useCallback } from "react";
import {
  collection, query, where, onSnapshot, getDocs,
  orderBy, limit
} from "firebase/firestore";
import { db, auth } from "../configs/firebase-config";
import { onAuthStateChanged } from "firebase/auth";
import Header from "../components/Header";

const Dashboard = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState(0);
  const [pendingApt, setPendingApt] = useState(0);
  const [unreadMsgs, setUnreadMsgs] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  /* ─── Listen for auth state changes ─── */
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(true); // Reset loading when user changes
      
      if (user) {
        console.log("User changed to:", user.uid);
        // Data fetching will be triggered by the currentUser dependency in other useEffect
      } else {
        console.log("No user logged in");
        setPatients(0);
        setPendingApt(0);
        setUnreadMsgs(0);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  /* ─── Fetch counts with real-time updates ─── */
  useEffect(() => {
    if (!currentUser) {
      setPatients(0);
      setPendingApt(0);
      setUnreadMsgs(0);
      if (!loading) setLoading(false);
      return;
    }

    console.log("Setting up listeners for user:", currentUser.uid);
    const unsubscribeFunctions = [];

    /* Active patients = clients where consultantId == currentUser.uid */
    const unsubClients = onSnapshot(
      query(collection(db, "clients"), where("consultantId", "==", currentUser.uid)),
      (snap) => {
        setPatients(snap.size);
      },
      (error) => {
        console.error("Error fetching patients:", error);
      }
    );
    unsubscribeFunctions.push(unsubClients);

    /* Pending appointments */
    const unsubReq = onSnapshot(
      query(
        collection(db, "bookings"),
        where("consultantId", "==", currentUser.uid),
        where("status", "==", "pending")
      ),
      (snap) => {
        setPendingApt(snap.size);
      },
      (error) => {
        console.error("Error fetching pending appointments:", error);
      }
    );
    unsubscribeFunctions.push(unsubReq);

    /* Unread messages: optimized real-time listener */
    const setupMessagesListener = async () => {
      try {
        const chatsQuery = query(
          collection(db, "chats"), 
          where("doctorUid", "==", currentUser.uid)
        );
        
        const chatsSnapshot = await getDocs(chatsQuery);
        const chatIds = chatsSnapshot.docs.map(doc => doc.id);

        if (chatIds.length === 0) {
          setUnreadMsgs(0);
          setLoading(false);
          return;
        }

        // Set up listeners for each chat's unread messages
        chatIds.forEach(chatId => {
          const messagesQuery = query(
            collection(db, "chats", chatId, "messages"),
            where("seenByDoctor", "==", false)
          );

          const unsubMessages = onSnapshot(messagesQuery, async () => {
            // Recalculate total unread messages
            let totalUnread = 0;
            const messagePromises = chatIds.map(async (id) => {
              try {
                const msgSnap = await getDocs(
                  query(
                    collection(db, "chats", id, "messages"), 
                    where("seenByDoctor", "==", false)
                  )
                );
                return msgSnap.size;
              } catch (error) {
                console.error(`Error fetching messages for chat ${id}:`, error);
                return 0;
              }
            });
            
            const results = await Promise.all(messagePromises);
            totalUnread = results.reduce((sum, count) => sum + count, 0);
            
            setUnreadMsgs(totalUnread);
            setLoading(false);
          }, (error) => {
            console.error("Error in messages listener:", error);
          });
          
          unsubscribeFunctions.push(unsubMessages);
        });
      } catch (error) {
        console.error("Error setting up messages listener:", error);
        setUnreadMsgs(0);
        setLoading(false);
      }
    };

    setupMessagesListener();

    return () => {
      console.log("Cleaning up listeners for user:", currentUser?.uid);
      unsubscribeFunctions.forEach(unsub => unsub());
    };
  }, [currentUser]);

  /* Refresh dashboard data */
  const refreshDashboard = useCallback(async () => {
    if (!currentUser) {
      setPatients(0);
      setPendingApt(0);
      setUnreadMsgs(0);
      return;
    }

    setLoading(true);
    try {
      console.log("Refreshing dashboard for user:", currentUser.uid);
      
      // Re-fetch patients count
      const patientsSnap = await getDocs(
        query(collection(db, "clients"), where("consultantId", "==", currentUser.uid))
      );
      setPatients(patientsSnap.size);

      // Re-fetch pending appointments
      const pendingSnap = await getDocs(
        query(
          collection(db, "bookings"),
          where("consultantId", "==", currentUser.uid),
          where("status", "==", "pending")
        )
      );
      setPendingApt(pendingSnap.size);

      // Re-fetch unread messages
      const chats = await getDocs(
        query(collection(db, "chats"), where("doctorUid", "==", currentUser.uid))
      );
      let totalUnread = 0;
      
      const promises = chats.docs.map(async (c) => {
        try {
          const msgs = await getDocs(
            query(
              collection(db, "chats", c.id, "messages"),
              where("seenByDoctor", "==", false)
            )
          );
          totalUnread += msgs.size;
        } catch (error) {
          console.error(`Error refreshing messages for chat ${c.id}:`, error);
        }
      });
      
      await Promise.all(promises);
      setUnreadMsgs(totalUnread);
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error refreshing dashboard:", error);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

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

  if (!currentUser && !loading) {
    return (
      <div className="w-full min-h-screen bg-gradient-to-b from-white to-[#F2C2DE] flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <span className="text-xl text-gray-600">Please log in to view the dashboard</span>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-gradient-to-b from-white to-[#F2C2DE] flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#DA79B9] mx-auto mb-4"></div>
            <span className="text-xl text-gray-600">
              {currentUser ? "Loading dashboard…" : "Checking authentication…"}
            </span>
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
          {/* Header with refresh button and user info */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Dashboard Overview
              </h1>
             
            </div>
            <button
              onClick={refreshDashboard}
              disabled={loading}
              className="bg-[#DA79B9] text-white px-6 py-2 rounded-lg hover:bg-[#c43d8b] transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Refreshing..." : "Refresh Data"}
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
              Last updated: {lastUpdated.toLocaleTimeString()}
            
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;