// შემოგვაქვს Firebase-ის მოდულები პირდაპირ ბრაუზერისთვის
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

// შენი Firebase პროექტის მონაცემები
const firebaseConfig = {
  apiKey: "AIzaSyCZJwpkhkajivpUSthxvzNvPNtZkP6z92Y",
  authDomain: "taxi-terjola.firebaseapp.com",
  projectId: "taxi-terjola",
  storageBucket: "taxi-terjola.firebasestorage.app",
  messagingSenderId: "550946182746",
  appId: "1:550946182746:web:ef1bb532f9e705a140ea63"
};

// ვაინიციალიზებთ Firebase-ს და Firestore მონაცემთა ბაზას
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);