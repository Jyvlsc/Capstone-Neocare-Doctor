// src/screens/Clients.jsx

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
} from "firebase/firestore";
import { db, auth } from "../configs/firebase-config";
import Header from "../components/Header";

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null);
  const [consultantId, setConsultantId] = useState(null);

  const navigate = useNavigate();
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!currentUser) {
      navigate("/");
      return;
    }

    let unsubscribe;
    (async () => {
      setLoading(true);

      // 1️⃣ load the signed-in user’s role & consultantId
      const userRef = doc(db, "users", currentUser.uid);
      const userSnap = await getDoc(userRef);

      let detectedRole, cid;
      if (userSnap.exists()) {
        const data = userSnap.data();
        detectedRole = data.role;
        cid = detectedRole === "staff"
          ? data.consultantId      // ← correct field
          : currentUser.uid;
      } else {
        // fallback if they exist only in consultants/
        const consSnap = await getDoc(
          doc(db, "consultants", currentUser.uid)
        );
        if (!consSnap.exists()) {
          console.warn("No profile found.");
          navigate("/");
          return;
        }
        detectedRole = "consultant";
        cid = currentUser.uid;
      }

      setRole(detectedRole);
      setConsultantId(cid);

      // 2️⃣ subscribe to clients where consultantId == cid
      const q = query(
        collection(db, "clients"),
        where("consultantId", "==", cid)
      );
      unsubscribe = onSnapshot(
        q,
        snap => {
          setClients(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          setLoading(false);
        },
        err => {
          console.error("Clients listener error:", err);
          setLoading(false);
        }
      );
    })();

    return () => unsubscribe?.();
  }, [currentUser, navigate]);

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-gradient-to-b from-white to-[#F2C2DE] flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <span className="text-xl text-gray-600">Loading clients…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-white to-[#F2C2DE] flex flex-col">
      <Header />

      <main className="flex-1 flex flex-col items-center pt-20 px-4">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          {role === "staff" ? "Doctor’s Clients" : "Clients"}
        </h1>
        <p className="text-center text-gray-700 mb-8 max-w-md">
          {role === "staff"
            ? "Here are the clients under your assigned doctor."
            : "Manage your client relationships and view details below."}
        </p>

        <section className="w-full max-w-3xl space-y-4">
          {clients.length > 0 ? (
            clients.map(c => (
              <div
                key={c.id}
                className="bg-white shadow-md rounded-lg p-6 flex justify-between"
              >
                {/* Client Info */}
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {c.fullName}
                  </h2>
                  {c.email && (
                    <p className="text-sm text-gray-600">{c.email}</p>
                  )}
                  <p className="text-sm mt-1">
                    <span className="font-medium">Status:</span> {c.status}
                  </p>
                  <p className="text-sm text-gray-600">{c.email}</p>
                  
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  {/* 1) Always let staff & consultants view history */}
                  <button
                    onClick={() => navigate(`/clients/${c.id}`)}
                    className="px-4 py-2 rounded-lg bg-[#DA79B9] text-white font-medium hover:bg-[#C064A0] transition"
                  >
                    View
                  </button>

                  {/* 2) Now both roles can add notes */}
                  {["staff", "consultant"].includes(role) && (
                    <button
                      onClick={() =>
                        navigate(`/clients/add-consultation-note/${c.id}`)
                      }
                      className="px-4 py-2 rounded-lg border-2 border-[#DA79B9] text-[#DA79B9] font-medium hover:bg-[#FBEAF5] transition"
                    >
                      Add Note
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-600">
              {role === "staff"
                ? "Your doctor has no clients yet."
                : "No clients found. Accept appointment requests to add clients."}
            </p>
          )}
        </section>
      </main>
    </div>
  );
}