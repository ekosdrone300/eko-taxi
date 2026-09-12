import { db } from "./firebase-config.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

const authScreen = document.getElementById("auth-screen");
const appScreen = document.getElementById("app-screen");
const centerPin = document.getElementById("center-pin");
let map;

// 1. შემოწმება: უკვე ხომ არ არის შესული?
const savedPhone = localStorage.getItem("passengerPhone");
const savedName = localStorage.getItem("passengerName");

if (savedPhone && savedName) {
    showAppScreen(savedName);
} else {
    authScreen.style.display = "flex";
    appScreen.style.display = "none";
}

// 2. შესვლის ლოგიკა
document.getElementById("login-btn").addEventListener("click", () => {
    const name = document.getElementById("name-input").value.trim();
    const phone = document.getElementById("phone-input").value.trim();

    if (name === "" || phone.length < 9) {
        document.getElementById("error-msg").innerText = "შეავსეთ სახელი და სწორი ნომერი!";
        return;
    }

    localStorage.setItem("passengerName", name);
    localStorage.setItem("passengerPhone", phone);
    showAppScreen(name);
});

// ეკრანის გადართვა და მონაცემების ასახვა
function showAppScreen(name) {
    authScreen.style.display = "none";
    appScreen.style.display = "block";
    
    // ვხატავთ პროფილის მონაცემებს
    document.getElementById("display-name").innerText = name;
    document.getElementById("user-avatar").innerText = name.charAt(0).toUpperCase(); // სახელის პირველი ასო
    
    initMap();
}

// გასვლა
document.getElementById("logout-btn").addEventListener("click", () => {
    localStorage.clear();
    window.location.reload();
});

// 3. რუკის და ცენტრალური პინის ლოგიკა
function initMap() {
    if (!map) {
        map = L.map('map', { zoomControl: false }).setView([42.1795, 42.9786], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
        
        // რუკის გამოძრავებისას პინის ანიმაცია
        map.on('movestart', () => centerPin.classList.add('moving'));
        map.on('moveend', () => centerPin.classList.remove('moving'));
        
        // GPS ლოკაციის პოვნა და რუკის იქ გადატანა
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(pos => {
                map.setView([pos.coords.latitude, pos.coords.longitude], 16);
            });
        }
    }
}

// შეკვეთის გაგზავნა ზუსტად იმ კოორდინატებზე, სადაც პინია
document.getElementById("call-taxi-btn").addEventListener("click", async () => {
    const btn = document.getElementById("call-taxi-btn");
    
    // ვიღებთ რუკის ცენტრის (პინის) ზუსტ კოორდინატებს
    const center = map.getCenter();
    
    btn.disabled = true;
    btn.innerText = "⏳ იძებნება მძღოლი...";

    try {
        await addDoc(collection(db, "Rides"), {
            passenger_name: localStorage.getItem("passengerName"),
            passenger_phone: localStorage.getItem("passengerPhone"),
            status: "pending",
            pickup_location: { lat: center.lat, lng: center.lng },
            price_to_pay: 3.00,
            system_fee: 0.40,
            created_at: serverTimestamp()
        });
        btn.innerText = "✅ შეკვეთა გაიგზავნა!";
        btn.style.backgroundColor = "#27ae60";
        
        // ღილაკის დაბრუნება საწყის მდგომარეობაში 3 წამში
        setTimeout(() => {
            btn.innerText = "🚕 ტაქსის გამოძახება";
            btn.style.backgroundColor = "#f39c12";
            btn.disabled = false;
        }, 3000);
        
    } catch (e) {
        console.error("შეცდომა:", e);
        btn.disabled = false;
        btn.innerText = "❌ შეცდომა, სცადეთ თავიდან";
    }
});