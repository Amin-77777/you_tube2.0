// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCLUXZaNo8JmAEmrwdxmoLlcCsAL84OIdk",
  authDomain: "yourtube-59b5e.firebaseapp.com",
  projectId: "yourtube-59b5e",
  storageBucket: "yourtube-59b5e.firebasestorage.app",
  messagingSenderId: "702456664732",
  appId: "1:702456664732:web:0b9cec41eb3fb3fdb31359",
  measurementId: "G-V2MB5GFYGE",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
export { auth, provider };
