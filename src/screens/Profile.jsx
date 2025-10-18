/* src/screens/Profile.jsx */
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db } from "../configs/firebase-config";
import Header from "../components/Header";
import Logo from "../assets/Logo.png";

/* ───── constants ───── */
const daysOpt  = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const hrsOpt   = [
  "8:00 AM to 9:00 AM","9:00 AM to 10:00 AM","10:00 AM to 11:00 AM","11:00 AM to 12:00 PM",
  "12:00 PM to 1:00 PM","1:00 PM to 2:00 PM","2:00 PM to 3:00 PM","3:00 PM to 4:00 PM","4:00 PM to 5:00 PM",
];
const platOpt  = ["In-person", "Online"];

const Profile = () => {
  const user = auth.currentUser;
  const nav  = useNavigate();

  const [docId, setDocId] = useState("");
  const [loading, setLoading] = useState(true);

  const [email, setEmail]                 = useState("");
  const [name, setName]                   = useState("");
  const [specialty, setSpecialty]         = useState("");
  const [contactInfo, setContactInfo]     = useState("");
  const [hospitalAddress, setHospitalAddress]   = useState("");
  const [availableDays, setAvailableDays] = useState([]);
  const [consultationHours, setConsultationHours] = useState([]);
  const [platform, setPlatform]           = useState([]);
  const [photoUrl, setPhotoUrl]           = useState("");
  const [newPhotoFile, setNewPhotoFile]   = useState(null);
  const [previewImg, setPreviewImg]       = useState(null);
  const [unavailableNote, setUnavailableNote] = useState("");

  useEffect(()=>{
    if(!user){ nav("/"); return; }
    const load = async()=>{
      const snap = await getDoc(doc(db,"consultants",user.uid));
      if(!snap.exists()){
        alert("Consultant profile not found.");
        return;
      }
      const d = snap.data();
      setDocId(snap.id);
      setEmail(d.email || "");
      setName(d.name || "");
      setSpecialty(d.specialty || "");
      setContactInfo(d.contactInfo || "");
      setHospitalAddress(d.birthCenterAddress || "");  // ← load from birthCenterAddress
      setAvailableDays(d.availableDays || []);
      setConsultationHours(d.consultationHours || []);
      setPlatform(d.platform || []);
      setPhotoUrl(d.profilePhoto || "");
      setUnavailableNote(d.unavailableNote || "");
      setLoading(false);
    };
    load();
  },[user,nav]);

  const toggle = (val, arr, setArr) =>
    setArr(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewPhotoFile(file);
      setPreviewImg(URL.createObjectURL(file));
    }
  };

  const saveProfile = async()=>{
    try{
      let pic = photoUrl;
      if(newPhotoFile){
        const st = getStorage();
        const snap = await uploadBytes(ref(st,`profilePhotos/${user.uid}`), newPhotoFile);
        pic = await getDownloadURL(snap.ref);
      }

      let clinicId;
      const q = query(collection(db,"users"),where("role","==","clinic"));
      const ss = await getDocs(q);
      ss.forEach(c => {
        if(!clinicId && hospitalAddress && c.data().birthCenterAddress === hospitalAddress){
          clinicId = c.id;
        }
      });

      await updateDoc(doc(db,"consultants",docId),{
        name,
        specialty,
        contactInfo,
        birthCenterAddress: hospitalAddress,  // ← save to birthCenterAddress
        availableDays,
        consultationHours,
        platform,
        profilePhoto: pic,
        unavailableNote,
        ...(clinicId && { clinicId })
      });
      alert("Profile updated!");
    } catch(e){
      console.error(e);
      alert("Update failed.");
    }
  };

  if(loading){
    return (
      <div className="w-full min-h-screen bg-gradient-to-b from-white to-[#F2C2DE] flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <span className="text-xl text-gray-600">Loading profile…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-white to-[#F2C2DE] flex flex-col">
      <Header />

      <div className="flex items-center justify-center mt-8 mb-6">
        <img src={Logo} alt="NeoCare" className="w-16 h-16" />
        <span className="ml-3 text-4xl font-extrabold font-mono text-[#DA79B9]">
          NeoCare
        </span>
      </div>

      <main className="flex-1 flex justify-center px-4 pb-10">
        <div className="bg-white shadow-lg rounded-xl w-full max-w-5xl overflow-hidden md:flex">

          {/* LEFT – editable form */}
          <div className="md:w-1/2 p-8 space-y-6 overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-800">My Profile</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-800">Email</label>
                <input
                  value={email} disabled
                  className="mt-1 block w-full rounded-xl border border-gray-300 bg-gray-100 px-4 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-800">Name</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-[#DA79B9] px-4 py-2 focus:ring-2 focus:ring-[#DA79B9]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-800">Specialty</label>
                <input
                  value={specialty}
                  onChange={e => setSpecialty(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-[#DA79B9] px-4 py-2 focus:ring-2 focus:ring-[#DA79B9]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-2">Profile Photo</label>
                
                {/* Custom file upload button */}
                <div className="flex flex-col items-start space-y-3">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="profile-photo-upload"
                    />
                    <div className="px-4 py-2 bg-[#DA79B9] text-white rounded-xl hover:bg-[#C064A0] transition-colors font-medium">
                      Choose Profile Picture
                    </div>
                  </label>
                  
                  {/* File name display */}
                  {newPhotoFile && (
                    <p className="text-sm text-gray-600">
                      Selected: {newPhotoFile.name}
                    </p>
                  )}
                  
                  {/* Image preview */}
                  {(previewImg || photoUrl) && (
                    <div className="mt-2">
                      <p className="text-sm font-medium text-gray-800 mb-2">Preview:</p>
                      <img
                        src={previewImg || photoUrl}
                        alt="Profile Preview"
                        className="w-24 h-24 object-cover rounded-full border-2 border-[#DA79B9]"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-800">Phone Number</label>
              <input
                value={contactInfo}
                onChange={e => setContactInfo(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-[#DA79B9] px-4 py-2 focus:ring-2 focus:ring-[#DA79B9]"
              />
            </div>

            <hr className="border-gray-200" />
            <h3 className="text-lg font-semibold text-gray-800">Consultation Details</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-800">Available Days</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {daysOpt.map(d => (
                    <label key={d} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        className="h-5 w-5 text-[#DA79B9] border-gray-300 rounded"
                        checked={availableDays.includes(d)}
                        onChange={() => toggle(d, availableDays, setAvailableDays)}
                      />
                      <span className="text-sm text-gray-800">{d}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800">Consultation Hours</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {hrsOpt.map(h => (
                    <label key={h} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        className="h-5 w-5 text-[#DA79B9] border-gray-300 rounded"
                        checked={consultationHours.includes(h)}
                        onChange={() => toggle(h, consultationHours, setConsultationHours)}
                      />
                      <span className="text-sm text-gray-800">{h}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800">Platform</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {platOpt.map(p => (
                    <label key={p} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        className="h-5 w-5 text-[#DA79B9] border-gray-300 rounded"
                        checked={platform.includes(p)}
                        onChange={() => toggle(p, platform, setPlatform)}
                      />
                      <span className="text-sm text-gray-800">{p}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-800">Unavailable Note</label>
              <textarea
                value={unavailableNote}
                onChange={e => setUnavailableNote(e.target.value)}
                placeholder="E.g. On vacation May 15–22"
                className="mt-1 block w-full rounded-xl border border-[#DA79B9] px-4 py-2 h-24 resize-none focus:ring-2 focus:ring-[#DA79B9]"
              />
            </div>

            <button
              onClick={saveProfile}
              className="w-full py-3 bg-[#DA79B9] text-white font-medium text-xl font-mono rounded-xl hover:bg-[#C064A0] transition-colors"
            >
              Save Changes
            </button>
          </div>

          {/* RIGHT – simply display address */}
          <div className="md:w-1/2 border-t md:border-t-0 md:border-l border-gray-200 p-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Hospital Address</h3>
            <p className="text-gray-800">{hospitalAddress || "No address provided"}</p>
          </div>

        </div>
      </main>
    </div>
  );
};

export default Profile;