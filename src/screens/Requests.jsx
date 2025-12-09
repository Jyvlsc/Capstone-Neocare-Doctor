// src/pages/Requests.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { db, auth } from "../configs/firebase-config";
import Header from "../components/Header";
import sendNotif from "../utils/sendNotif";

const API_BASE = "http://localhost:3000";

const Requests = () => {
  const [bookings, setBookings] = useState([]);
  const [busyId, setBusyId] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const nav = useNavigate();
  const user = auth.currentUser;

  const notifiedBookingsRef = useRef(new Set());

  useEffect(() => {
    if (!user) {
      nav("/");
      return;
    }

    const q = query(
      collection(db, "bookings"),
      where("doctorId", "==", user.uid),
      where("status", "in", ["pending", "accepted", "completed", "declined", "cancelled"])
    );

    const unsub = onSnapshot(q, (snapshot) => {
      (async () => {
        const raw = snapshot.docs.map((snap) => {
          const data = snap.data();
          let jsDate = null;
          if (data.date && typeof data.date.toDate === "function") {
            jsDate = data.date.toDate();
          } else if (data.date) {
            jsDate = new Date(data.date);
          }

          return {
            id: snap.id,
            userId: data.userId,
            amount: data.amount,
            paid: data.paid || false,
            status: data.status,
            fullName:
              data.fullName || data.userName || data.clientName || null,
            date: jsDate,
            rawDateValue: data.date,
            hour: data.hour,
            platform: data.platform,
          };
        });

        const toLookup = raw.filter((b) => !b.fullName).map((b) => b.userId);
        const unique = [...new Set(toLookup)];

        const snapshots = await Promise.all(
          unique.map((uid) => getDoc(doc(db, "users", uid)))
        );
        const nameMap = {};
        snapshots.forEach((uSnap) => {
          if (uSnap.exists()) {
            const u = uSnap.data();
            nameMap[uSnap.id] =
              u.fullName ||
              u.name ||
              [u.firstName, u.lastName].filter(Boolean).join(" ") ||
              u.displayName ||
              null;
          }
        });

        const enriched = raw.map((b) => ({
          ...b,
          fullName: b.fullName || nameMap[b.userId] || b.userId,
        }));

        const newPending = enriched.filter(
          (b) => b.status === "pending" && !notifiedBookingsRef.current.has(b.id)
        );

        if (newPending.length > 0 && user?.email) {
          const doctorSnap = await getDoc(doc(db, "consultants", user.uid));
          if (doctorSnap.exists()) {
            const doctor = doctorSnap.data();
            await sendNotif({
              email: user.email,
              name: doctor.name,
              bookings: newPending,
            });

            newPending.forEach((b) => notifiedBookingsRef.current.add(b.id));
          }
        }

        setBookings(enriched);
        setLoading(false);
      })().catch((e) => {
        console.error("Error enriching bookings:", e);
        setLoading(false);
      });
    });

    return () => unsub();
  }, [user, nav]);

  const accept = async (id) => {
    setBusyId(id);
    try {
      const bookingRef = doc(db, "bookings", id);
      await updateDoc(bookingRef, {
        status: "accepted",
        updatedAt: new Date(),
      });

      // Automatically switch to upcoming tab after accepting
      setFilter("upcoming");
      alert("Booking accepted! Client added.");
    } catch (e) {
      console.error("Accept error:", e);
      alert("Failed to accept—try again.");
    } finally {
      setBusyId("");
    }
  };

  const decline = async (id) => {
    if (!window.confirm("Decline this booking?")) return;
    setBusyId(id);
    try {
      const bookingRef = doc(db, "bookings", id);
      await updateDoc(bookingRef, {
        status: "declined",
        updatedAt: new Date(),
      });

      alert("Booking declined.");
    } catch (e) {
      console.error("Decline error:", e);
      alert("Failed to decline—try again.");
    } finally {
      setBusyId("");
    }
  };

  const markAsDone = async (id) => {
    const booking = bookings.find((b) => b.id === id);
    if (!booking) return alert("Booking not found.");

    const now = new Date();
    const appointmentDate = booking.date;

    // Check if it's the appointment day or later
    if (appointmentDate) {
      const today = new Date();
      const appointmentDay = new Date(appointmentDate);
      
      // Reset time to compare only dates
      today.setHours(0, 0, 0, 0);
      appointmentDay.setHours(0, 0, 0, 0);
      
      if (today < appointmentDay) {
        return alert(
          "Cannot mark this appointment as completed before the appointment date."
        );
      }
    }

    if (!window.confirm("Mark this appointment as completed?")) return;

    setBusyId(id);
    try {
      const bookingRef = doc(db, "bookings", id);
      await updateDoc(bookingRef, {
        status: "completed",
        completedAt: new Date(),
      });

      setBookings((prev) =>
        prev.map((b) =>
          b.id === id
            ? { ...b, status: "completed", completedAt: new Date() }
            : b
        )
      );

      alert("Appointment marked as completed.");
    } catch (e) {
      console.error("Mark done error:", e);
      alert("Failed to mark as completed—try again.");
    } finally {
      setBusyId("");
    }
  };

  const cancelAppointment = async (id) => {
    if (!window.confirm("Cancel this upcoming appointment?")) return;

    setBusyId(id);
    try {
      const bookingRef = doc(db, "bookings", id);
      await updateDoc(bookingRef, {
        status: "cancelled",
        cancelledAt: new Date(),
      });

      setBookings((prev) =>
        prev.map((b) =>
          b.id === id
            ? { ...b, status: "cancelled", cancelledAt: new Date() }
            : b
        )
      );

      alert("Appointment has been cancelled.");
    } catch (e) {
      console.error("Cancel error:", e);
      alert("Failed to cancel—try again.");
    } finally {
      setBusyId("");
    }
  };

  const fmtDate = (d) =>
    d.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <span>Loading bookings…</span>
        </div>
      </div>
    );
  }

  const now = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filteredBookings = bookings.filter((b) => {
    if (filter === "pending")
      return b.status === "pending" && !b.paid;

    if (filter === "upcoming") {
      // Show accepted appointments that are NOT completed
      // Also show paid pending appointments that are accepted
      const isAcceptedAndNotCompleted = b.status === "accepted" && b.status !== "completed";
      const isPaidPending = b.status === "pending" && b.paid;
      
      return (isAcceptedAndNotCompleted || isPaidPending);
    }

    if (filter === "completed")
      return b.status === "completed";

    return false;
  });

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 pt-20 px-6">
        <div className="flex gap-4 mb-4">
          <button
            onClick={() => setFilter("pending")}
            className={`px-4 py-2 rounded ${
              filter === "pending"
                ? "bg-[#DA79B9] text-white"
                : "bg-white text-gray-700"
            }`}
          >
            Appointment Requests
          </button>
          <button
            onClick={() => setFilter("upcoming")}
            className={`px-4 py-2 rounded ${
              filter === "upcoming"
                ? "bg-[#DA79B9] text-white"
                : "bg-white text-gray-700"
            }`}
          >
            Upcoming Appointments
          </button>
          <button
            onClick={() => setFilter("completed")}
            className={`px-4 py-2 rounded ${
              filter === "completed"
                ? "bg-[#DA79B9] text-white"
                : "bg-white text-gray-700"
            }`}
          >
            Completed Appointments
          </button>
        </div>

        <h1 className="text-3xl font-bold mb-6">
          {filter === "pending"
            ? "Pending Appointments"
            : filter === "upcoming"
            ? "Upcoming Appointments"
            : "Completed Appointments"}
        </h1>

        <section className="space-y-4">
          {filteredBookings.length > 0 ? (
            filteredBookings.map((b) => {
              // Check if it's the appointment day or later for showing "Mark as Done"
              let canMarkAsDone = false;
              if (b.date) {
                const appointmentDay = new Date(b.date);
                appointmentDay.setHours(0, 0, 0, 0);
                
                // Can mark as done if today is appointment day or later
                canMarkAsDone = today >= appointmentDay;
              }

              return (
                <div
                  key={b.id}
                  className={`p-6 bg-white shadow-lg rounded-xl flex justify-between items-center border-l-4 hover:shadow-xl transition-shadow
                    ${
                      filter === "upcoming" && b.paid && b.status !== "completed"
                        ? "border-yellow-500"
                        : "border-[#DA79B9]"
                    }
                  `}
                >
                  <div className="flex flex-col gap-1">
                    <p className="font-semibold text-xl">{b.fullName}</p>
                    <p className="text-sm text-gray-600">
                      {b.date
                        ? fmtDate(b.date)
                        : b.rawDateValue
                        ? new Date(b.rawDateValue).toLocaleString()
                        : "Date TBD"}
                    </p>
                    <p className="text-sm text-gray-600">
                      ₱{(b.amount / 100).toFixed(2)}
                    </p>

                    {filter === "upcoming" && b.paid && b.status === "pending" && (
                      <span className="mt-1 px-2 py-1 text-xs font-semibold text-yellow-800 bg-yellow-100 rounded">
                        Paid – Needs Completion
                      </span>
                    )}
                    
                    {filter === "upcoming" && b.status === "accepted" && (
                      <span className="mt-1 px-2 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded">
                        Accepted
                      </span>
                    )}
                  </div>

                  {filter === "pending" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => accept(b.id)}
                        disabled={busyId === b.id}
                        className="px-4 py-2 bg-[#DA79B9] text-white rounded disabled:opacity-50"
                      >
                        {busyId === b.id ? "…" : "Accept"}
                      </button>
                      <button
                        onClick={() => decline(b.id)}
                        disabled={busyId === b.id}
                        className="px-4 py-2 border border-[#DA79B9] text-[#DA79B9] rounded disabled:opacity-50"
                      >
                        {busyId === b.id ? "…" : "Decline"}
                      </button>
                    </div>
                  )}

                  {filter === "upcoming" && (
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => markAsDone(b.id)}
                        disabled={busyId === b.id || !b.date || !canMarkAsDone}
                        className={`px-4 py-2 rounded text-white ${
                          b.date && canMarkAsDone
                            ? "bg-green-600 hover:bg-green-700"
                            : "bg-gray-400 cursor-not-allowed"
                        } disabled:opacity-50`}
                        title={
                          !b.date || !canMarkAsDone
                            ? "Cannot mark as done before the appointment date"
                            : ""
                        }
                      >
                        {busyId === b.id ? "…" : "Mark as Done"}
                      </button>

                      <button
                        onClick={() => cancelAppointment(b.id)}
                        disabled={busyId === b.id}
                        className="px-4 py-2 border border-red-500 text-red-500 rounded disabled:opacity-50"
                      >
                        {busyId === b.id ? "…" : "Cancel"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <p className="text-center text-gray-600">
              {filter === "pending"
                ? "No pending appointments."
                : filter === "upcoming"
                ? "No upcoming appointments."
                : "No completed appointments."}
            </p>
          )}
        </section>
      </main>
    </div>
  );
};

export default Requests;