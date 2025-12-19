import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
// Import only the necessary modules via import map

const firebaseConfig = {
  apiKey: "AIzaSyA0LgKZ1IvJU08-Mbvj_TVwGt_agb2CwEY",
  authDomain: "romaneio-b7c4d.firebaseapp.com",
  databaseURL: "https://romaneio-b7c4d-default-rtdb.firebaseio.com",
  projectId: "romaneio-b7c4d",
  storageBucket: "romaneio-b7c4d.firebasestorage.app",
  messagingSenderId: "913795184496",
  appId: "1:913795184496:web:4f3915c3f493686f1c81b5",
  measurementId: "G-VH8B8VDF60"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export { db };

