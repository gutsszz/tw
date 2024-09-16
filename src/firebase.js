import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyC_tCpObdQvEjVJTJRrjjn44SeOrbdbpdU",
  authDomain: "proj-64fca.firebaseapp.com",
  projectId: "proj-64fca",
  storageBucket: "proj-64fca.appspot.com",
  messagingSenderId: "481368871573",
  appId: "1:481368871573:web:d7492eb63b209424f6819c",
  measurementId: "G-SGW24CSCGP"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);

export { db };
