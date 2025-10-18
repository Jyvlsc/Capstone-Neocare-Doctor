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
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
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
  const [saving, setSaving] = useState(false);

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
      setHospitalAddress(d.birthCenterAddress || "");
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
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file (JPEG, PNG, etc.)');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Please select an image smaller than 5MB');
        return;
      }
      
      setNewPhotoFile(file);
      setPreviewImg(URL.createObjectURL(file));
    }
  };

  const deleteOldPhoto = async (oldPhotoUrl) => {
    if (!oldPhotoUrl) return;
    
    try {
      const storage = getStorage();
      // Extract the path from the URL or use the default path
      let photoRef;
      if (oldPhotoUrl.includes('profilePhotos/')) {
        // If the URL contains the path, extract it
        const matches = oldPhotoUrl.match(/profilePhotos%2F([^?]+)/);
        if (matches && matches[1]) {
          photoRef = ref(storage, `profilePhotos/${matches[1]}`);
        } else {
          // Fallback: use the user ID
          photoRef = ref(storage, `profilePhotos/${user.uid}`);
        }
      } else {
        // Default path
        photoRef = ref(storage, `profilePhotos/${user.uid}`);
      }
      
      await deleteObject(photoRef);
      console.log('Old profile photo deleted successfully');
    } catch (error) {
      // If the file doesn't exist, we can ignore the error
      if (error.code !== 'storage/object-not-found') {
        console.error('Error deleting old photo:', error);
      }
    }
  };

  const saveProfile = async() => {
    if (saving) return;
    
    setSaving(true);
    try {
      let pic = photoUrl;
      const storage = getStorage();
      
      if (newPhotoFile) {
        // Delete old photo if it exists and is not the default one
        if (photoUrl && !photoUrl.includes('default-profile')) {
          await deleteOldPhoto(photoUrl);
        }
        
        // Upload new photo
        const photoRef = ref(storage, `profilePhotos/${user.uid}_${Date.now()}`);
        const snapshot = await uploadBytes(photoRef, newPhotoFile);
        pic = await getDownloadURL(snapshot.ref);
        
        // Update local state
        setPhotoUrl(pic);
        setNewPhotoFile(null);
        
        // Clean up the object URL
        if (previewImg) {
          URL.revokeObjectURL(previewImg);
          setPreviewImg(null);
        }
      }

      // Find clinic ID based on hospital address
      let clinicId;
      const q = query(collection(db,"users"),where("role","==","clinic"));
      const ss = await getDocs(q);
      ss.forEach(c => {
        if(!clinicId && hospitalAddress && c.data().birthCenterAddress === hospitalAddress){
          clinicId = c.id;
        }
      });

      // Update Firestore document
      await updateDoc(doc(db,"consultants",docId),{
        name,
        specialty,
        contactInfo,
        birthCenterAddress: hospitalAddress,
        availableDays,
        consultationHours,
        platform,
        profilePhoto: pic, // This saves the URL in Firestore
        unavailableNote,
        updatedAt: new Date(),
        ...(clinicId && { clinicId })
      });
      
      alert("Profile updated successfully!");
    } catch (e) {
      console.error("Update failed:", e);
      alert("Update failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const removeProfilePhoto = async () => {
    if (!photoUrl) return;
    
    try {
      // Delete from storage
      await deleteOldPhoto(photoUrl);
      
      // Update Firestore
      await updateDoc(doc(db,"consultants",docId),{
        profilePhoto: "",
        updatedAt: new Date()
      });
      
      // Update local state
      setPhotoUrl("");
      setNewPhotoFile(null);
      if (previewImg) {
        URL.revokeObjectURL(previewImg);
        setPreviewImg(null);
      }
      
      alert("Profile photo removed successfully!");
    } catch (error) {
      console.error("Error removing profile photo:", error);
      alert("Failed to remove profile photo. Please try again.");
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
                  <div className="flex gap-2">
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
                    
                    {/* Remove photo button */}
                    {(photoUrl || newPhotoFile) && (
                      <button
                        type="button"
                        onClick={removeProfilePhoto}
                        className="px-4 py-2 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-colors font-medium"
                      >
                        Remove Photo
                      </button>
                    )}
                  </div>
                  
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
              disabled={saving}
              className={`w-full py-3 bg-[#DA79B9] text-white font-medium text-xl font-mono rounded-xl transition-colors ${
                saving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#C064A0]'
              }`}
            >
              {saving ? 'Saving...' : 'Save Changes'}
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