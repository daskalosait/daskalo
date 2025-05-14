import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs, query, where, deleteDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import {
  getStorage, ref, uploadBytes, getDownloadURL, deleteObject
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyC0bZ2Kvw_5GS1VqFf6HuSl3BhEwrKtk8Q",
  authDomain: "maikatisymebal.firebaseapp.com",
  projectId: "maikatisymebal",
  storageBucket: "maikatisymebal.firebasestorage.app",
  messagingSenderId: "100684443502",
  appId: "1:100684443502:web:f5cbf15c958af909a49b7f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

const categoryDropdown = document.getElementById("category-dropdown");
const uploadForm = document.getElementById("upload-form");
const uploadCategorySelect = document.getElementById("class");
const uploaderInput = document.getElementById("uploader");
const themeInput = document.getElementById("theme");
const fileInput = document.getElementById("file");
const presentationList = document.getElementById("presentation-list");
const viewer = document.getElementById("presentation-details");
const presTheme = document.getElementById("pres-theme");
const presDate = document.getElementById("pres-date");

document.getElementById("admin-login").addEventListener("click", () => {
  document.getElementById("upload-popup").style.display = "flex";
});
document.getElementById("close-popup").addEventListener("click", () => {
  document.getElementById("upload-popup").style.display = "none";
});

categoryDropdown.addEventListener("change", (e) => {
  const selected = e.target.value;
  uploadCategorySelect.value = selected;
  loadPresentations(selected);
});

uploadForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const uploader = uploaderInput.value.trim();
  const theme = themeInput.value.trim();
  const classCategory = uploadCategorySelect.value;
  const file = fileInput.files[0];

  if (!file || !uploader || !theme) {
    alert("Попълнете всички полета и изберете файл!");
    return;
  }

  const fileName = encodeURIComponent(file.name);
  const filePath = `presentations/${classCategory}/${fileName}`;

  try {
    const storageRef = ref(storage, filePath);
    await uploadBytes(storageRef, file);
    const fileURL = await getDownloadURL(storageRef);

    await addDoc(collection(db, "presentations"), {
      uploader,
      theme,
      category: classCategory,
      fileURL,
      uploadedAt: new Date()
    });

    alert("Успешно качване!");
    uploadForm.reset();
    document.getElementById("upload-popup").style.display = "none";
    loadPresentations(classCategory);
  } catch (error) {
    console.error("Грешка при качване:", error);
    alert("Възникна грешка при качване.");
  }
});

function openGoogleDocsViewer(fileURL) {
  const encodedUrl = encodeURIComponent(fileURL);
  window.open(`https://docs.google.com/viewerng/viewer?url=${encodedUrl}`, '_blank');
}

async function loadPresentations(category) {
  presentationList.innerHTML = "<li>Зареждане...</li>";
  viewer.style.display = "none";
  presTheme.innerText = "";
  presDate.innerText = "";

  try {
    const q = query(collection(db, "presentations"), where("category", "==", category));
    const snapshot = await getDocs(q);

    presentationList.innerHTML = "";

    if (snapshot.empty) {
      presentationList.innerHTML = "<li>Няма презентации.</li>";
      return;
    }

    snapshot.forEach((doc) => {
      const data = doc.data();
      const li = document.createElement("li");
      const button = document.createElement("button");

      let formattedDate = "";
      if (data.uploadedAt?.toDate) {
        const dateObj = data.uploadedAt.toDate();
        const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
        const day = dateObj.getDate().toString().padStart(2, '0');
        const year = dateObj.getFullYear();
        formattedDate = `Прикачено на ${month}.${day}.${year}`;
      }

      button.innerText = `${data.theme} - ${data.uploader}${formattedDate ? ` - ${formattedDate}` : ''}`;
      button.addEventListener("click", () => openGoogleDocsViewer(data.fileURL));

      li.appendChild(button);
      presentationList.appendChild(li);
    });
  } catch (err) {
    console.error("Грешка при зареждане на презентации:", err);
    presentationList.innerHTML = "<li>Грешка при зареждане на презентации.</li>";
  }
}

const adminPopup = document.getElementById("admin-popup");
const adminPasswordInput = document.getElementById("admin-password");
const adminSubmit = document.getElementById("admin-submit");
const adminControls = document.getElementById("admin-controls");
const adminLoginForm = document.getElementById("admin-login-form");
const adminCategory = document.getElementById("admin-category");
const adminList = document.getElementById("admin-list");

document.getElementById("admin-panel").addEventListener("click", () => {
  adminPopup.style.display = "flex";
});

document.getElementById("close-admin").addEventListener("click", () => {
  adminPopup.style.display = "none";
});

adminSubmit.addEventListener("click", () => {
  const password = adminPasswordInput.value.trim();
  if (password === "admin123") {
    adminLoginForm.style.display = "none";
    adminControls.style.display = "block";
    loadAdminList(adminCategory.value);
  } else {
    alert("Грешна парола!");
  }
});

adminCategory.addEventListener("change", () => {
  loadAdminList(adminCategory.value);
});

async function loadAdminList(category) {
  adminList.innerHTML = "<li>Зареждане...</li>";
  const q = query(collection(db, "presentations"), where("category", "==", category));
  const snapshot = await getDocs(q);

  adminList.innerHTML = "";
  if (snapshot.empty) {
    adminList.innerHTML = "<li>Няма презентации.</li>";
    return;
  }

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const li = document.createElement("li");
    li.innerHTML = `${data.theme} - ${data.uploader} <button>🗑️ Изтрий</button>`;
    li.querySelector("button").addEventListener("click", async () => {
      if (confirm("Сигурен ли сте, че искате да изтриете тази презентация?")) {
        const urlPath = decodeURIComponent(new URL(data.fileURL).pathname.split("/o/")[1].split("?")[0]);
        const fileRef = ref(storage, urlPath);
        try {
          await deleteObject(fileRef);
          await deleteDoc(docSnap.ref);
          alert("Успешно изтрито!");
          loadAdminList(category);
        } catch (err) {
          console.error("Грешка при изтриване:", err);
          alert("Грешка при изтриване.");
        }
      }
    });
    adminList.appendChild(li);
  });
}

const defaultCategory = "Geography";
categoryDropdown.value = defaultCategory;
uploadCategorySelect.value = defaultCategory;
loadPresentations(defaultCategory);