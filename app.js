import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs, query, where, deleteDoc, doc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getStorage, ref, uploadBytes, getDownloadURL, deleteObject
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import firebaseConfig from './firebaseconfig.js';

// Init Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

// Elements
const form = document.querySelector("form");
const presentationList = document.getElementById("presentation-list");
const adminList = document.getElementById("admin-list");
const viewer = document.getElementById("viewer");
const presTheme = document.getElementById("pres-theme");
const presDate = document.getElementById("pres-date");
const classButtons = document.querySelectorAll("button[data-class]");
const adminPanel = document.getElementById("admin-panel");
const adminLoginBtn = document.getElementById("admin-login");
const logoutBtn = document.getElementById("logout");

let currentClass = "Geography";

// Handle form upload
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const uploader = document.getElementById("uploader").value;
  const theme = document.getElementById("theme").value;
  const selectedClass = document.getElementById("class").value;
  const file = document.getElementById("file").files[0];
  const date = new Date().toISOString().split("T")[0];

  const storageRef = ref(storage, `presentations/${Date.now()}_${file.name}`);
  await uploadBytes(storageRef, file);
  const fileURL = await getDownloadURL(storageRef);

  await addDoc(collection(db, "presentations"), {
    uploader, theme, class: selectedClass, date, fileURL, filePath: storageRef.fullPath
  });

  alert("Uploaded successfully!");
  form.reset();
  loadPresentations(currentClass);
});

// Load presentations by class
async function loadPresentations(selectedClass) {
  presentationList.innerHTML = "";
  const q = query(collection(db, "presentations"), where("class", "==", selectedClass));
  const snapshot = await getDocs(q);
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const li = document.createElement("li");
    li.textContent = data.uploader;
    li.addEventListener("click", () => {
      presTheme.textContent = `Theme: ${data.theme}`;
      presDate.textContent = `Date: ${data.date}`;
      viewer.src = `https://docs.google.com/gview?url=${encodeURIComponent(data.fileURL)}&embedded=true`;
      viewer.style.display = "block";
    });
    presentationList.appendChild(li);
  });

  // Load admin delete list
  if (auth.currentUser) loadAdminList();
}

// Switch class tabs
classButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    currentClass = btn.dataset.class;
    loadPresentations(currentClass);
  });
});

// Admin login
adminLoginBtn.addEventListener("click", async () => {
  const email = prompt("Enter admin email:");
  const password = prompt("Enter password:");
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    alert("Login failed: " + err.message);
  }
});

// Auth state
onAuthStateChanged(auth, user => {
  if (user) {
    adminPanel.style.display = "block";
    adminLoginBtn.style.display = "none";
    logoutBtn.style.display = "inline";
    loadAdminList();
  } else {
    adminPanel.style.display = "none";
    adminLoginBtn.style.display = "inline";
    logoutBtn.style.display = "none";
  }
});

// Logout
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
});

// Admin delete list
async function loadAdminList() {
  adminList.innerHTML = "";
  const snapshot = await getDocs(collection(db, "presentations"));
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const li = document.createElement("li");
    li.textContent = `${data.uploader} (${data.class}) - ${data.theme}`;
    const delBtn = document.createElement("button");
    delBtn.textContent = "❌ Delete";
    delBtn.addEventListener("click", async () => {
      if (confirm("Delete this presentation?")) {
        await deleteDoc(doc(db, "presentations", docSnap.id));
        await deleteObject(ref(storage, data.filePath));
        loadPresentations(currentClass);
      }
    });
    li.appendChild(delBtn);
    adminList.appendChild(li);
  });
}