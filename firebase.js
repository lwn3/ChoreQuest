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
  deleteDoc,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
// 1. Import Auth dependency
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup,
  signInWithRedirect,
  signInWithCustomToken,
  getRedirectResult, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

import {
  getFunctions,
  httpsCallable
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-functions.js";

const firebaseConfig = {
  apiKey: "AIzaSyDeSI1GanQ0yUXmexvVOzrk3DVbRYqbxqI",
  authDomain: "chorequest-3a721.web.app",
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
const functions = getFunctions(app, "us-central1");

window.ChoreQuestFirebase = {
  db,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  // 3. Expose them to app.js
  auth,
  googleProvider,
  signInWithRedirect,
  signInWithCustomToken,
  getRedirectResult,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  functions,
  httpsCallable
};
