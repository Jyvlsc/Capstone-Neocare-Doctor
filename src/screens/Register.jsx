// src/screens/Register.jsx - UPDATED with Subspecialty Support

import React, { useState, useRef, useEffect } from "react";
import Logo from "../assets/Logo.png";
import { Link, useNavigate } from "react-router-dom";
import { auth, db } from "../configs/firebase-config";
import {
  createUserWithEmailAndPassword,
  deleteUser
} from "firebase/auth";
import {
  doc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import {
  GoogleMap,
  Marker,
  InfoWindow,
  Autocomplete,
  useLoadScript,
} from "@react-google-maps/api";

/** ───── constants ───── **/
const MAP_LIBRARIES = ["places"];
const mapContainerStyle = { width: "100%", height: "300px" };
const defaultCenter = { lat: 10.3157, lng: 123.8854 };
const customMapStyles = [
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#193341" }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#2c5a71" }] },
  { featureType: "road",   elementType: "geometry", stylers: [{ color: "#29768a" }, { lightness: 0 }] },
  { featureType: "poi",    elementType: "geometry", stylers: [{ color: "#406d80" }] },
  { featureType: "transit",elementType: "geometry", stylers: [{ color: "#406d80" }] },
  {
    elementType: "labels.text.stroke",
    stylers: [{ visibility: "on" }, { color: "#3e606f" }, { weight: 2 }, { gamma: 0.84 }],
  },
  { elementType: "labels.text.fill", stylers: [{ color: "#ffffff" }] },
];

const DAYS  = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const HOURS = [
  "8:00 AM to 9:00 AM","9:00 AM to 10:00 AM","10:00 AM to 11:00 AM",
  "11:00 AM to 12:00 PM","12:00 PM to 1:00 PM","1:00 PM to 2:00 PM",
  "2:00 PM to 3:00 PM","3:00 PM to 4:00 PM","4:00 PM to 5:00 PM",
];
const PLATFORMS = ["In-person","Online"];

// ===== UPDATED: Added subspecialties for OB-GYN =====
const SPECIALTIES = [
  "Cardiology",
  "Neurology",
  "Dermatology",
  "Gastroenterology",
  "Endocrinology",
  "Orthopedics",
  "Pediatrics",
  "General Medicine",
  "Ophthalmology",
  "Psychiatry",
  "Pulmonology",
  "Infectious Diseases",
  "Obstetrics & Gynecology",  // OB-GYN specialty
];

// OB-GYN subspecialties (matching chatbot)
const OB_GYN_SUBSPECIALTIES = [
  { code: "GENERAL_OB", name: "General Obstetrics & Gynecology" },
  { code: "MFM", name: "Maternal-Fetal Medicine (Perinatology)" },
  { code: "OBSTETRIC_ULTRASOUND", name: "Obstetric Ultrasound" },
  { code: "FETAL_MEDICINE", name: "Fetal Medicine" },
  { code: "REI", name: "Reproductive Endocrinology & Infertility (REI)" },
  { code: "GYN_ONCOLOGY", name: "Gynecologic Oncology" },
];

const norm = e => e.trim().toLowerCase();
const toggle = (v, arr, setArr) =>
  setArr(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);

/** ───── clinic lookup ───── **/
async function findClinicByName(name) {
  console.log("🔍 Searching for clinic with name:", name);
  
  // Try exact match first
  let q = query(
    collection(db, "users"),
    where("role", "==", "clinic"),
    where("birthCenterName", "==", name)
  );
  let snap = await getDocs(q);
  
  if (!snap.empty) {
    console.log("✅ Found clinic with exact match:", snap.docs[0].id);
    return { id: snap.docs[0].id, ...snap.docs[0].data() };
  }
  
  // Try case-insensitive match
  console.log("⚠️ Exact match failed, trying case-insensitive...");
  const allClinicsSnap = await getDocs(
    query(collection(db, "users"), where("role", "==", "clinic"))
  );
  
  console.log("📋 Total clinics found:", allClinicsSnap.size);
  
  const normalizedName = name.toLowerCase().trim();
  for (const doc of allClinicsSnap.docs) {
    const clinicName = doc.data().birthCenterName || "";
    console.log("  - Checking clinic:", clinicName);
    
    if (clinicName.toLowerCase().trim() === normalizedName) {
      console.log("✅ Found clinic with case-insensitive match:", doc.id);
      return { id: doc.id, ...doc.data() };
    }
  }
  
  console.log("❌ No clinic found with name:", name);
  console.log("📋 Available clinics:");
  allClinicsSnap.docs.forEach(doc => {
    console.log("  -", doc.data().birthCenterName);
  });
  
  return null;
}

/** ───── geocode helper ───── **/
function geocodeLatLng(latLng, setName, setAddr) {
  if (!window.google?.maps) return;
  const geocoder = new window.google.maps.Geocoder();
  const places   = new window.google.maps.places.PlacesService(document.createElement("div"));
  geocoder.geocode({ location: latLng }, (res, st) => {
    if (st !== "OK" || !res[0]) return;
    const formatted = res[0].formatted_address;
    places.nearbySearch(
      { location: latLng, radius: 500, type: "hospital" },
      (r2, st2) => {
        const name = (st2 === window.google.maps.places.PlacesServiceStatus.OK && r2[0])
          ? r2[0].name
          : formatted;
        setName(name);
        setAddr(formatted);
      }
    );
  });
}

export default function Register() {
  const nav     = useNavigate();
  const storage = getStorage();

  /** shared **/
  const [role, setRole]   = useState("consultant"); // or "staff"
  const [email, setEmail] = useState("");
  const [pwd, setPwd]     = useState("");
  const [pwd2, setPwd2]   = useState("");

  /** staff **/
  const [first, setFirst]      = useState("");
  const [last, setLast]        = useState("");
  const [docEmail, setDocEmail]= useState("");

  /** consultant **/
  const [consultFirstName, setConsultFirstName] = useState("");
  const [consultLastName,  setConsultLastName]  = useState("");
  const [spec, setSpec]     = useState("");
  const [subspecialty, setSubspecialty] = useState(""); // NEW: For OB-GYN subspecialty
  const [phone, setPhone]   = useState("");
  const [photo, setPhoto]   = useState(null);
  const [preview, setPreview]= useState(null);
  const [days, setDays]     = useState([]);
  const [hours, setHours]   = useState([]);
  const [plat, setPlat]     = useState([]);

  /** map & autocomplete **/
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: "AIzaSyBcJDGxtpPyKTJaH8VsPdWq3RkohUNkfd4",
    libraries: MAP_LIBRARIES,
  });
  const [autocomplete, setAutocomplete] = useState(null);
  const [marker, setMarker]             = useState(null);
  const [centerMap, setCenterMap]       = useState(defaultCenter);
  const [cName, setCName]               = useState("");
  const [cAddr, setCAddr]               = useState("");

  const onLoadAuto = auto => setAutocomplete(auto);
  const onPlaceChanged = () => {
    if (!autocomplete) return;
    const place = autocomplete.getPlace();
    if (place.geometry) {
      const loc = {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng()
      };
      setCenterMap(loc);
      setMarker(loc);
      setCName(place.name || place.formatted_address);
      setCAddr(place.formatted_address);
    }
  };

  const handleMapClick = e => {
    const loc = { lat: e.latLng.lat(), lng: e.latLng.lng() };
    setCenterMap(loc);
    setMarker(loc);
    geocodeLatLng(loc, setCName, setCAddr);
  };

  const onPhoto = e => {
    const f = e.target.files?.[0];
    if (f) {
      setPhoto(f);
      setPreview(URL.createObjectURL(f));
    }
  };

  // NEW: Check if OB-GYN is selected
  const isObGyn = spec === "Obstetrics & Gynecology";
  
  // DEBUG: Remove these console logs after testing
  console.log("🔍 Current specialty:", spec);
  console.log("🔍 isObGyn:", isObGyn);

  /** ───── submit ───── **/
  const submit = async () => {
    if (pwd !== pwd2) return alert("Passwords don't match.");

    /** STAFF **/
    if (role === "staff") {
      if (!first || !last || !email || !docEmail) {
        return alert("Please fill every field.");
      }
      let cred;
      try {
        cred = await createUserWithEmailAndPassword(auth, email, pwd);
      } catch (e) {
        console.error(e);
        return alert(e.message);
      }
      // lookup consultant by emailLower || email
      let snap = await getDocs(
        query(collection(db, "consultants"),
              where("emailLower", "==", norm(docEmail)))
      );
      if (snap.empty) {
        snap = await getDocs(
          query(collection(db, "consultants"),
                where("email", "==", docEmail.trim()))
        );
      }
      if (snap.empty) {
        await deleteUser(cred.user).catch(()=>{});
        return alert("Consultant e-mail not found.");
      }
      const consultantId = snap.docs[0].id;
      await setDoc(doc(db, "users", cred.user.uid), {
        firstName:  first,
        lastName:   last,
        email:      email.trim(),
        emailLower: norm(email),
        role:       "staff",
        consultantId,
        createdAt:  new Date(),
      });
      alert("Medical-staff account created!");
      return nav("/");
    }

    /** CONSULTANT **/
    const fullName = `${consultFirstName.trim()} ${consultLastName.trim()}`;
    
    // UPDATED: Check for subspecialty if OB-GYN
    if (!email || !consultFirstName || !consultLastName || !spec || !phone || !days.length || !hours.length || !plat.length || !marker) {
      return alert("Please complete all consultant fields.");
    }
    
    if (isObGyn && !subspecialty) {
      return alert("Please select an OB-GYN subspecialty.");
    }
    
    let cred;
    try {
      cred = await createUserWithEmailAndPassword(auth, email, pwd);
    } catch (e) {
      console.error(e);
      return alert(e.message);
    }
    const { user } = cred;

    // photo upload
    let photoURL = "";
    if (photo) {
      const up = await uploadBytes(
        storageRef(storage, `profilePhotos/${user.uid}`),
        photo
      );
      photoURL = await getDownloadURL(up.ref);
    }

    // find clinic
    const clinic = await findClinicByName(cName);
    if (!clinic) {
      console.log("❌ Clinic lookup failed for:", cName);
      
      // OPTION 1: Create a fallback clinic entry
      // Uncomment this to allow registration without existing clinic
      /*
      const fallbackClinic = {
        id: "auto-created-clinic-" + Date.now(),
        birthCenterName: cName,
        birthCenterAddress: cAddr,
        role: "clinic"
      };
      
      // Write to users collection
      await setDoc(doc(db, "users", fallbackClinic.id), {
        ...fallbackClinic,
        createdAt: new Date(),
        email: email.trim(),
        emailLower: norm(email)
      });
      
      alert("Consultant registered! A new clinic entry was created.");
      
      // Continue with registration using fallback clinic
      const consultantData = {
        userId: user.uid,
        email: email.trim(),
        emailLower: norm(email),
        name: fullName,
        specialty: spec,
        contactInfo: phone,
        profilePhoto: photoURL,
        birthCenterName: cName,
        birthCenterAddress: cAddr,
        birthCenterLocation: marker,
        availableDays: days,
        consultationHours: hours,
        platform: plat,
        approvalStatus: "pending",
        clinicId: fallbackClinic.id,
        status: "active",
        isDeleted: false,
      };
      
      if (isObGyn && subspecialty) {
        consultantData.subspecialty = subspecialty;
      }
      
      await setDoc(doc(db, "consultants", user.uid), consultantData);
      await setDoc(doc(db, "users", user.uid), {
        email: email.trim(),
        emailLower: norm(email),
        name: fullName,
        role: "consultant",
        specialty: spec,
        clinicId: fallbackClinic.id,
        createdAt: new Date(),
      });
      
      return nav("/");
      */
      
      // OPTION 2: Show detailed error with available clinics
      await deleteUser(user).catch(()=>{});
      const allClinics = await getDocs(
        query(collection(db, "users"), where("role", "==", "clinic"))
      );
      const clinicNames = allClinics.docs.map(d => d.data().birthCenterName).join("\n  - ");
      return alert(
        `No clinic found with name: "${cName}"\n\n` +
        `Available clinics in database:\n  - ${clinicNames}\n\n` +
        `Please select one of these clinics from the map.`
      );
    }

    // write consultant doc
    const consultantData = {
      userId:             user.uid,
      email:              email.trim(),
      emailLower:         norm(email),
      name:               fullName,
      specialty:          spec,
      contactInfo:        phone,
      profilePhoto:       photoURL,
      birthCenterName:    cName,
      birthCenterAddress: cAddr,
      birthCenterLocation:marker,
      availableDays:      days,
      consultationHours:  hours,
      platform:           plat,
      approvalStatus:     "pending",
      clinicId:           clinic.id,
      status:             "active",  // NEW: Set as active
      isDeleted:          false,     // NEW: Not deleted
    };
    
    // NEW: Add subspecialty if OB-GYN
    if (isObGyn && subspecialty) {
      consultantData.subspecialty = subspecialty;
    }
    
    await setDoc(doc(db, "consultants", user.uid), consultantData);
    
    // write user doc
    await setDoc(doc(db, "users", user.uid), {
      email:      email.trim(),
      emailLower: norm(email),
      name:       fullName,
      role:       "consultant",
      specialty:  spec,
      clinicId:   clinic.id,
      createdAt:  new Date(),
    });

    alert("Consultant registered! Await clinic approval.");
    nav("/");
  };

  if (loadError) return <p>Error loading maps</p>;

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-white to-[#F2C2DE] p-4">
      {/* Logo */}
      <Link to="/" className="mb-8 flex items-center space-x-3">
        <img src={Logo} alt="NeoCare" className="w-16 h-16"/>
        <span className="text-4xl font-extrabold font-mono text-[#DA79B9]">NeoCare</span>
      </Link>

      {/* Role selector */}
      <div className="bg-white shadow-lg rounded-xl w-full max-w-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Register as</h2>
        <div className="flex space-x-6">
          {["consultant","staff"].map(r => (
            <label key={r} className="flex items-center space-x-2">
              <input
                type="radio"
                className="h-5 w-5 text-[#DA79B9]"
                checked={role === r}
                onChange={() => setRole(r)}
              />
              <span className="text-gray-800">
                {r==="consultant"?"Consultant":"Medical Staff"}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Staff Form */}
      {role === "staff" && (
        <div className="bg-white shadow-lg rounded-xl w-full max-w-md p-8">
          <h2 className="text-2xl font-bold mb-6">Register as Medical Staff</h2>
          {[
            ["First Name", first, setFirst],
            ["Last Name",  last,  setLast],
            ["Email",      email, setEmail,    "email"],
            ["Password",   pwd,   setPwd,      "password"],
            ["Confirm Password", pwd2, setPwd2,"password"],
            ["Consultant's Email", docEmail, setDocEmail, "email"],
          ].map(([lbl, val, setter, type="text"]) => (
            <div key={lbl} className="mb-4">
              <label className="block text-sm font-medium">{lbl}</label>
              <input
                type={type}
                value={val}
                onChange={e => setter(e.target.value)}
                placeholder={lbl}
                className="mt-1 w-full rounded-xl border border-[#DA79B9] px-4 py-2"
              />
            </div>
          ))}
          <button
            onClick={submit}
            className="w-full py-3 mt-6 bg-[#DA79B9] text-white rounded-xl hover:bg-[#C064A0]"
          >
            Sign Up
          </button>
        </div>
      )}

      {/* Consultant Form */}
      {role === "consultant" && (
        <div className="bg-white shadow-lg rounded-xl w-full max-w-5xl overflow-hidden md:flex">
          {/* Left – Details */}
          <div className="md:w-1/2 p-8 space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">Register as Consultant</h2>

            {/* Identity */}
            <div>
              <label className="block text-sm font-medium text-gray-800">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter Email"
                className="mt-1 block w-full rounded-xl border border-[#DA79B9] px-4 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-800">First Name</label>
              <input
                value={consultFirstName}
                onChange={e => setConsultFirstName(e.target.value)}
                placeholder="Enter First Name"
                className="mt-1 block w-full rounded-xl border border-[#DA79B9] px-4 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-800">Last Name</label>
              <input
                value={consultLastName}
                onChange={e => setConsultLastName(e.target.value)}
                placeholder="Enter Last Name"
                className="mt-1 block w-full rounded-xl border border-[#DA79B9] px-4 py-2"
              />
            </div>

            {/* Specialty dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-800">Specialty</label>
              <select
                value={spec}
                onChange={e => {
                  setSpec(e.target.value);
                  // Reset subspecialty when changing specialty
                  if (e.target.value !== "Obstetrics & Gynecology") {
                    setSubspecialty("");
                  }
                }}
                className="mt-1 block w-full rounded-xl border border-[#DA79B9] px-4 py-2"
              >
                <option value="">-- Select Specialty --</option>
                {SPECIALTIES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* NEW: Subspecialty dropdown (only for OB-GYN) */}
            {isObGyn && (
              <div className="bg-pink-50 border-2 border-pink-300 rounded-xl p-4">
                <label className="block text-sm font-medium text-gray-800 mb-2">
                  OB-GYN Subspecialty <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-600 mb-3">
                  Select your area of specialization within OB-GYN:
                </p>
                <select
                  value={subspecialty}
                  onChange={e => setSubspecialty(e.target.value)}
                  className="block w-full rounded-xl border border-[#DA79B9] px-4 py-2"
                >
                  <option value="">-- Select Subspecialty --</option>
                  {OB_GYN_SUBSPECIALTIES.map(sub => (
                    <option key={sub.code} value={sub.code}>
                      {sub.name}
                    </option>
                  ))}
                </select>
                {subspecialty && (
                  <p className="text-xs text-green-600 mt-2">
                    ✓ Selected: {OB_GYN_SUBSPECIALTIES.find(s => s.code === subspecialty)?.name}
                  </p>
                )}
              </div>
            )}

            {/* Photo */}
            <div>
              <label className="block text-sm font-medium text-gray-800">Profile Photo</label>
              <input type="file" accept="image/*" onChange={onPhoto} className="mt-1 w-full"/>
              {preview && (
                <img src={preview} alt="preview" className="mt-2 w-24 h-24 object-cover rounded-full border"/>
              )}
            </div>

            {/* Passwords */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                ["Password", pwd, setPwd],
                ["Confirm Password", pwd2, setPwd2],
              ].map(([lbl, val, setter]) => (
                <div key={lbl}>
                  <label className="block text-sm font-medium text-gray-800">{lbl}</label>
                  <input
                    type="password"
                    value={val}
                    onChange={e => setter(e.target.value)}
                    placeholder={lbl}
                    className="mt-1 block w-full rounded-xl border border-[#DA79B9] px-4 py-2"
                  />
                </div>
              ))}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-800">Phone Number</label>
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="Enter phone"
                className="mt-1 block w-full rounded-xl border border-[#DA79B9] px-4 py-2"
              />
            </div>

            <hr className="border-gray-200"/>
            <h3 className="text-lg font-semibold text-gray-800">Consultation Details</h3>

            {/* Days */}
            <label className="block text-sm font-medium text-gray-800">Available Days</label>
            <div className="flex flex-wrap gap-2 mb-4">
              {DAYS.map(d => (
                <label key={d} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    className="h-5 w-5 text-[#DA79B9]"
                    checked={days.includes(d)}
                    onChange={() => toggle(d, days, setDays)}
                  />
                  <span className="text-sm">{d}</span>
                </label>
              ))}
            </div>

            {/* Hours */}
            <label className="block text-sm font-medium text-gray-800">Consultation Hours</label>
            <div className="flex flex-wrap gap-2 mb-4">
              {HOURS.map(h => (
                <label key={h} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    className="h-5 w-5 text-[#DA79B9]"
                    checked={hours.includes(h)}
                    onChange={() => toggle(h, hours, setHours)}
                  />
                  <span className="text-sm">{h}</span>
                </label>
              ))}
            </div>

            {/* Platform */}
            <label className="block text-sm font-medium text-gray-800">Platform</label>
            <div className="flex flex-wrap gap-2 mb-4">
              {PLATFORMS.map(p => (
                <label key={p} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    className="h-5 w-5 text-[#DA79B9]"
                    checked={plat.includes(p)}
                    onChange={() => toggle(p, plat, setPlat)}
                  />
                  <span className="text-sm">{p}</span>
                </label>
              ))}
            </div>

            <button
              onClick={submit}
              className="w-full py-3 bg-[#DA79B9] text-white rounded-xl hover:bg-[#C064A0]"
            >
              Sign Up
            </button>
          </div>

          {/* Right – Map & Autocomplete */}
          <div className="md:w-1/2 border-t md:border-t-0 md:border-l border-gray-200 p-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Select Birth Center Location
            </h3>

            {isLoaded ? (
              <Autocomplete onLoad={onLoadAuto} onPlaceChanged={onPlaceChanged}>
                <input
                  type="text"
                  placeholder="Search for birth center"
                  className="w-full mb-4 rounded-xl border border-[#DA79B9] px-4 py-2"
                />
              </Autocomplete>
            ) : (
              <p>Loading map...</p>
            )}

            {isLoaded && (
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                zoom={12}
                center={centerMap}
                onClick={handleMapClick}
                options={{ styles: customMapStyles }}
              >
                {marker && (
                  <>
                    <Marker
                      position={marker}
                      draggable
                      onDragEnd={handleMapClick}
                    />
                    <InfoWindow
                      position={marker}
                      onCloseClick={() => setMarker(null)}
                    >
                      <div>
                        <p className="font-medium">{cName}</p>
                        <p className="text-sm">{cAddr}</p>
                      </div>
                    </InfoWindow>
                  </>
                )}
              </GoogleMap>
            )}

            {cName && (
              <p className="mt-4 text-sm text-gray-700">
                <strong>Selected Center:</strong> {cName}
              </p>
            )}
            {cAddr && (
              <p className="text-sm text-gray-700">
                <strong>Address:</strong> {cAddr}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}