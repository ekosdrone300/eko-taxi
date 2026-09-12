import { db } from "./firebase-config.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

const authScreen = document.getElementById("auth-screen");
const appScreen = document.getElementById("app-screen");
let map, userMarker, currentLat, currentLng;

// ==========================================
// 1. შემოწმება: უკვე ხომ არ არის შესული?
// ==========================================
const savedPhone = localStorage.getItem("passengerPhone");
const savedName = localStorage.getItem("passengerName");

if (savedPhone && savedName) {
    authScreen.style.display = "none";
    appScreen.style.display = "block";
    initMap();
} else {
    authScreen.style.display = "flex";
    appScreen.style.display = "none";
}

// ==========================================
// 2. მარტივი შესვლის ლოგიკა
// ==========================================
document.getElementById("login-btn").addEventListener("click", () => {
    const name = document.getElementById("name-input").value.trim();
    const phone = document.getElementById("phone-input").value.trim();

    if (name === "" || phone.length < 9) {
        document.getElementById("error-msg").innerText = "შეავსეთ სახელი და სწორი ნომერი!";
        return;
    }

    // ვინახავთ მონაცემებს ლოკალურად
    localStorage.setItem("passengerName", name);
    localStorage.setItem("passengerPhone", phone);

    // ვრთავთ რუკას
    authScreen.style.display = "none";
    appScreen.style.display = "block";
    initMap();
});

// გასვლა
document.getElementById("logout-btn").addEventListener("click", () => {
    localStorage.removeItem("passengerName");
    localStorage.removeItem("passengerPhone");
    window.location.reload();
});

// ==========================================
// 3. რუკის და ტაქსის გამოძახების ლოგიკა
// ==========================================
function initMap() {
    if (!map) {
        map = L.map('map', { zoomControl: false }).setView([42.1795, 42.9786], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
        
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(pos => {
                currentLat = pos.coords.latitude;
                currentLng = pos.coords.longitude;
                map.setView([currentLat, currentLng], 16);
                userMarker = L.marker([currentLat, currentLng]).addTo(map).bindPopup("თქვენი ლოკაცია").openPopup();
                
                const callBtn = document.getElementById("call-taxi-btn");
                callBtn.disabled = false;
                callBtn.innerText = "🚕 ტაქსის გამოძახება";
            }, (error) => {
                document.getElementById("location-status").innerText = "ლოკაციის წვდომა შეზღუდულია";
            });
        }
    }
}

document.getElementById("call-taxi-btn").addEventListener("click", async () => {
    const btn = document.getElementById("call-taxi-btn");
    btn.disabled = true;
    btn.innerText = "⏳ იძებნება მძღოლი...";

    try {
        await addDoc(collection(db, "Rides"), {
            passenger_name: localStorage.getItem("passengerName"), // ახლა უკვე სახელიც მიდის ბაზაში
            passenger_phone: localStorage.getItem("passengerPhone"),
            status: "pending",
            pickup_location: { lat: currentLat, lng: currentLng },
            price_to_pay: 3.00,
            system_fee: 0.40,
            created_at: serverTimestamp()
        });
        btn.innerText = "✅ შეკვეთა გაიგზავნა!";
        btn.style.backgroundColor = "#27ae60";
    } catch (e) {
        console.error("შეცდომა ბაზაში გაგზავნისას:", e);
        btn.disabled = false;
        btn.innerText = "❌ შეცდომა, სცადეთ თავიდან";
    }
});