import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
// 1. Import Auth dependency
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup,
  getRedirectResult, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDeSI1GanQ0yUXmexvVOzrk3DVbRYqbxqI",
  authDomain: "chorequest-3a721.firebaseapp.com",
  projectId: "chorequest-3a721",
  storageBucket: "chorequest-3a721.firebasestorage.app",
  messagingSenderId: "475400353768",
  appId: "1:475400353768:web:e7cf782635401a4fda165d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
// 2. Initialize Auth
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

window.ChoreQuestFirebase = {
  db,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  query,
  where,
  // 3. Expose them to app.js
  auth,
  googleProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
};
