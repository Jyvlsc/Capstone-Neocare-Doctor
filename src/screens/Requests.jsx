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
      where(
        "status",
        "in",
        ["pending", "accepted", "completed", "declined", "cancelled", "paid"]
      )
    );

    const unsub = onSnapshot(q, (snapshot) => {
      (async () => {
        const raw = snapshot.docs.map((snap) => {
          const data = snap.data();
          let jsDate = null;

          if (data.date?.toDate) jsDate = data.date.toDate();
          else if (data.date) jsDate = new Date(data.date);

          return {
            id: snap.id,
            userId: data.userId,
            amount: data.amount,
            paid: data.paid || false,
            status: data.status,
            fullName: data.fullName || data.userName || null,
            date: jsDate,
            rawDateValue: data.date,
            hour: data.hour,
            platform: data.platform,
          };
        });

        const missingNames = raw.filter((b) => !b.fullName).map((b) => b.userId);
        const unique = [...new Set(missingNames)];

        const snaps = await Promise.all(
          unique.map((u) => getDoc(doc(db, "users", u)))
        );
        const nameMap = {};

        snaps.forEach((s) => {
          if (s.exists()) {
            const u = s.data();
            nameMap[s.id] =
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

        // notify new pending
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

            newPending.forEach((b) =>
              notifiedBookingsRef.current.add(b.id)
            );
          }
        }

        setBookings(enriched);
        setLoading(false);
      })();
    });

    return () => unsub();
  }, [user, nav]);

  // ACCEPT
  const accept = async (id) => {
    setBusyId(id);
    try {
      await updateDoc(doc(db, "bookings", id), {
        status: "accepted",
        updatedAt: new Date(),
      });
      setFilter("upcoming");
      alert("Booking accepted!");
    } catch (e) {
      alert("Error accepting booking.");
    } finally {
      setBusyId("");
    }
  };

  // DECLINE
  const decline = async (id) => {
    if (!window.confirm("Decline this booking?")) return;
    setBusyId(id);

    try {
      await updateDoc(doc(db, "bookings", id), {
        status: "declined",
        updatedAt: new Date(),
      });
      alert("Booking declined.");
    } finally {
      setBusyId("");
    }
  };

  // MARK AS DONE (UPDATED)
  const markAsDone = async (id) => {
    const booking = bookings.find((b) => b.id === id);
    if (!booking) return alert("Not found.");

    if (!booking.paid) {
      return alert("Cannot complete — patient has not paid.");
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const appt = new Date(booking.date);
    appt.setHours(0, 0, 0, 0);

    // Requirement: Only same day
    if (today.getTime() !== appt.getTime()) {
      return alert("You can only mark this appointment as done on the appointment day.");
    }

    if (!window.confirm("Mark appointment as completed?")) return;

    setBusyId(id);

    try {
      await updateDoc(doc(db, "bookings", id), {
        status: "completed",
        completedAt: new Date(),
      });

      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status: "completed" } : b))
      );

      alert("Appointment completed.");
    } finally {
      setBusyId("");
    }
  };

  // CANCEL
  const cancelAppointment = async (id) => {
    if (!window.confirm("Cancel this appointment?")) return;

    setBusyId(id);

    try {
      await updateDoc(doc(db, "bookings", id), {
        status: "cancelled",
        cancelledAt: new Date(),
      });

      setBookings((prev) =>
        prev.map((b) =>
          b.id === id ? { ...b, status: "cancelled" } : b
        )
      );
      alert("Appointment cancelled.");
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
        <div className="flex-1 flex items-center justify-center">Loading…</div>
      </div>
    );
  }

  // FILTER RULES
  const today = new Date();
  today.setHours(0, 0, 0, 0);

 const filteredBookings = bookings.filter((b) => {
  if (filter === "pending") {
    return b.status === "pending" && !b.paid;
  }

  if (filter === "upcoming") {
    return (
      (b.status === "accepted" || b.status === "paid") &&
      b.status !== "completed" &&
      b.status !== "cancelled" &&
      b.status !== "declined"
    );
  }

  if (filter === "completed") {
    return b.status === "completed";
  }

  return false;
});

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 pt-20 px-6">
        {/* FILTER BUTTONS */}
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

        {/* BOOKINGS LIST */}
        <section className="space-y-4">
          {filteredBookings.length > 0 ? (
            filteredBookings.map((b) => {
              let canMarkAsDone = false;

              if (b.date && b.paid) {
                const apptDay = new Date(b.date);
                apptDay.setHours(0, 0, 0, 0);

                // Only allow marking as done ON appointment date
                canMarkAsDone =
                  today.getTime() === apptDay.getTime() && b.paid;
              }

              return (
                <div
                  key={b.id}
                  className={`p-6 bg-white shadow-lg rounded-xl flex justify-between items-center border-l-4
                    ${
                      filter === "upcoming" &&
                      b.paid &&
                      b.status !== "completed"
                        ? "border-yellow-500"
                        : "border-[#DA79B9]"
                    }
                  `}
                >
                  <div>
                    <p className="font-semibold text-xl">{b.fullName}</p>
                    <p className="text-sm text-gray-600">
                      {b.date ? fmtDate(b.date) : "Date TBD"}
                    </p>
                    <p className="text-sm text-gray-600">
                      ₱{(b.amount / 100).toFixed(2)}
                    </p>

                   {filter === "upcoming" &&
  b.status === "paid" &&
  b.status !== "completed" && (
    <span className="mt-1 px-2 py-1 text-xs font-semibold text-yellow-800 bg-yellow-100 rounded">
      Paid – Waiting for Doctor to Mark Done
    </span>
  )}
                  </div>

                  {/* PENDING BUTTONS */}
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

                  {/* UPCOMING BUTTONS */}
                  {filter === "upcoming" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => markAsDone(b.id)}
                        disabled={busyId === b.id || !canMarkAsDone}
                        className={`px-4 py-2 rounded text-white ${
                          canMarkAsDone
                            ? "bg-green-600 hover:bg-green-700"
                            : "bg-gray-400 cursor-not-allowed"
                        }`}
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
