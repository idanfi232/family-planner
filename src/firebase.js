import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// הדבק כאן את האובייקט שקיבלת מ-Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyDDEFBW0PWYhNiRz1HEUvgq6JJ9YmRXlKs",
  authDomain: "family-planner-b41cd.firebaseapp.com",
  projectId: "family-planner-b41cd",
  storageBucket: "family-planner-b41cd.firebasestorage.app",
  messagingSenderId: "1050195747665",
  appId: "1:1050195747665:web:3107076ba66b3cb0bca970"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);