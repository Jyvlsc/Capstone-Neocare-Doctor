/* src/screens/Dashboard.jsx */
import React, { useEffect, useState, useCallback } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
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
  const [avgRating, setAvgRating] = useState(0);     // ⭐ NEW
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // ─── Handle Auth ───
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(true);
      if (!user) {
        setPatients(0);
        setPendingApt(0);
        setUnreadMsgs(0);
        setAvgRating(0);
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // ─── Firestore Real-Time Dashboard ───
  useEffect(() => {
    if (!currentUser) {
      setPatients(0);
      setPendingApt(0);
      setUnreadMsgs(0);
      setAvgRating(0);
      if (!loading) setLoading(false);
      return;
    }

    const unsubscribeFunctions = [];

    // Real-time patients
    const unsubClients = onSnapshot(
      query(collection(db, "clients"), where("consultantId", "==", currentUser.uid)),
      (snap) => setPatients(snap.size),
      (error) => console.error("Error fetching patients:", error)
    );
    unsubscribeFunctions.push(unsubClients);

    // Real-time pending appointments
    const unsubReq = onSnapshot(
      query(
        collection(db, "bookings"),
        where("consultantId", "==", currentUser.uid),
        where("status", "==", "pending")
      ),
      (snap) => setPendingApt(snap.size),
      (error) => console.error("Error fetching pending appointments:", error)
    );
    unsubscribeFunctions.push(unsubReq);

   
    const unsubRating = onSnapshot(
      query(
        collection(db, "bookings"),
        where("consultantId", "==", currentUser.uid),
        where("rating", "!=", null)
      ),
      (snap) => {
        if (snap.empty) {
          setAvgRating(0);
          return;
        }

        let total = 0;
        snap.forEach((d) => {
          const r = d.data().rating;
          if (typeof r === "number") total += r;
        });

        const average = total / snap.size;
        setAvgRating(average.toFixed(1));
      },
      (err) => console.error("Error fetching rating:", err)
    );
    unsubscribeFunctions.push(unsubRating);

    // ─── Real-time unread messages ───
    const chatsQuery = query(collection(db, "chats"), where("doctorUid", "==", currentUser.uid));

    const unsubChats = onSnapshot(chatsQuery, (chatsSnapshot) => {
      unsubscribeFunctions
        .filter((f) => f.__isMsgSubListener)
        .forEach((unsub) => unsub());

      let totalUnread = 0;
      const msgUnsubs = [];

      chatsSnapshot.forEach((chatDoc) => {
        const chatData = chatDoc.data();
        const chatId = chatDoc.id;
        const lastSeen = chatData.lastSeenByDoctor || null;

        const msgsRef = collection(db, "chats", chatId, "messages");
        const unsubMsgs = onSnapshot(msgsRef, (msgSnap) => {
          let unseenCount = 0;

          msgSnap.forEach((m) => {
            const msg = m.data();
            const msgTime = msg.createdAt?.toMillis?.() || 0;
            const lastSeenTime = lastSeen?.toMillis?.() || 0;

            if (
              (!msg.seenByDoctor || msg.seenByDoctor === false) &&
              msg.user?._id !== currentUser.uid &&
              msgTime > lastSeenTime
            ) {
              unseenCount++;
            }
          });

          totalUnread = chatsSnapshot.docs.reduce((sum, cDoc) => {
            if (cDoc.id === chatId) return sum + unseenCount;
            return sum;
          }, 0);

          setUnreadMsgs(totalUnread);
          setLastUpdated(new Date());
          setLoading(false);
        });

        unsubMsgs.__isMsgSubListener = true;
        msgUnsubs.push(unsubMsgs);
      });

      unsubscribeFunctions.push(...msgUnsubs);
    });

    unsubscribeFunctions.push(unsubChats);

    return () => unsubscribeFunctions.forEach((unsub) => unsub());
  }, [currentUser]);

  // ─── Manual Refresh Fallback ───
  const refreshDashboard = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);

    try {
      // Patients
      const patientsSnap = await getDocs(
        query(collection(db, "clients"), where("consultantId", "==", currentUser.uid))
      );
      setPatients(patientsSnap.size);

      // Pending appointments
      const pendingSnap = await getDocs(
        query(
          collection(db, "bookings"),
          where("consultantId", "==", currentUser.uid),
          where("status", "==", "pending")
        )
      );
      setPendingApt(pendingSnap.size);

     
      const ratingSnap = await getDocs(
        query(
          collection(db, "bookings"),
          where("consultantId", "==", currentUser.uid),
          where("rating", "!=", null)
        )
      );

      if (!ratingSnap.empty) {
        let total = 0;
        ratingSnap.forEach((d) => {
          const r = d.data().rating;
          if (typeof r === "number") total += r;
        });
        setAvgRating((total / ratingSnap.size).toFixed(1));
      } else {
        setAvgRating(0);
      }

      // unread messages
      const chatsSnap = await getDocs(
        query(collection(db, "chats"), where("doctorUid", "==", currentUser.uid))
      );

      let totalUnread = 0;
      const msgPromises = chatsSnap.docs.map(async (chatDoc) => {
        const chatData = chatDoc.data();
        const chatId = chatDoc.id;
        const lastSeen = chatData.lastSeenByDoctor || null;

        const msgsSnap = await getDocs(collection(db, "chats", chatId, "messages"));
        const unseen = msgsSnap.docs.filter((d) => {
          const msg = d.data();
          const msgTime = msg.createdAt?.toMillis?.() || 0;
          const lastSeenTime = lastSeen?.toMillis?.() || 0;

          return (
            (!msg.seenByDoctor || msg.seenByDoctor === false) &&
            msgTime > lastSeenTime
          );
        }).length;

        return unseen;
      });

      const unreadCounts = await Promise.all(msgPromises);
      totalUnread = unreadCounts.reduce((a, b) => a + b, 0);
      setUnreadMsgs(totalUnread);

      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error refreshing dashboard:", error);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // ─── UI ───
  const StatCard = ({ title, value, subtitle }) => (
    <div
      className={`bg-white shadow-lg rounded-2xl border-2 border-[#DA79B9] p-6 flex flex-col transition-all duration-300 hover:shadow-xl hover:scale-105`}
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
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Dashboard Overview</h1>
            <button
              onClick={refreshDashboard}
              disabled={loading}
              className="bg-[#DA79B9] text-white px-6 py-2 rounded-lg hover:bg-[#c43d8b] transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Refreshing..." : "Refresh Data"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <StatCard title="Active Patients" value={patients} subtitle="Under your care" />
            <StatCard title="Pending Appointments" value={pendingApt} subtitle="Awaiting confirmation" />
            <StatCard title="New Messages" value={unreadMsgs} subtitle="Unread conversations" />


            <StatCard 
              title="Average Rating" 
              value={avgRating} 
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
