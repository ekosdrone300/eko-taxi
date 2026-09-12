import { app, db } from "./firebase-config.js";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

const auth = getAuth(app);
auth.languageCode = 'ka';

// UI ელემენტები
const authScreen = document.getElementById("auth-screen");
const appScreen = document.getElementById("app-screen");
let map, userMarker, currentLat, currentLng;

// ==========================================
// 1. ავტორიზაციის მდგომარეობის შემოწმება
// ==========================================
onAuthStateChanged(auth, (user) => {
    if (user) {
        // მგზავრი ავტორიზებულია - ვრთავთ რუკას
        authScreen.style.display = "none";
        appScreen.style.display = "block";
        initMap();
    } else {
        // მგზავრი არ არის ავტორიზებული - ვრთავთ რეგისტრაციას
        authScreen.style.display = "flex";
        appScreen.style.display = "none";
        setupRecaptcha();
    }
});

// ==========================================
// 2. SMS ლოგიკა
// ==========================================
let confirmationResult = null;

function setupRecaptcha() {
    if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
            'size': 'normal',
            'callback': () => { document.getElementById("send-code-btn").disabled = false; }
        });
        window.recaptchaVerifier.render();
    }
}

document.getElementById("send-code-btn").addEventListener("click", () => {
    const phone = document.getElementById("phone-input").value.trim();
    signInWithPhoneNumber(auth, phone, window.recaptchaVerifier)
        .then((result) => {
            confirmationResult = result;
            document.getElementById("phone-section").style.display = "none";
            document.getElementById("code-section").style.display = "block";
        }).catch((err) => {
            console.error(err);
            document.getElementById("error-msg").innerText = "შეცდომა კოდის გაგზავნისას.";
        });
});

document.getElementById("verify-code-btn").addEventListener("click", () => {
    const code = document.getElementById("code-input").value.trim();
    confirmationResult.confirm(code).catch(() => {
        document.getElementById("error-msg").innerText = "არასწორი კოდი!";
    });
});

// გასვლის ღილაკი
document.getElementById("logout-btn").addEventListener("click", () => {
    signOut(auth).then(() => window.location.reload());
});

// ==========================================
// 3. რუკის და GPS ლოგიკა
// ==========================================
function initMap() {
    if (!map) {
        map = L.map('map', { zoomControl: false }).setView([42.1795, 42.9786], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
        
        // GPS პოვნა
        navigator.geolocation.getCurrentPosition(pos => {
            currentLat = pos.coords.latitude;
            currentLng = pos.coords.longitude;
            map.setView([currentLat, currentLng], 16);
            userMarker = L.marker([currentLat, currentLng]).addTo(map).bindPopup("თქვენი ლოკაცია").openPopup();
            
            const callBtn = document.getElementById("call-taxi-btn");
            callBtn.disabled = false;
            callBtn.innerText = "🚕 ტაქსის გამოძახება";
        });
    }
}

// შეკვეთის გაგზავნა
document.getElementById("call-taxi-btn").addEventListener("click", async () => {
    const btn = document.getElementById("call-taxi-btn");
    btn.disabled = true;
    btn.innerText = "⏳ იძებნება მძღოლი...";

    await addDoc(collection(db, "Rides"), {
        passenger_phone: auth.currentUser.phoneNumber, // ახლა უკვე ზუსტად ვიცით ვინ იძახებს!
        status: "pending",
        pickup_location: { lat: currentLat, lng: currentLng },
        price_to_pay: 3.00,
        system_fee: 0.40,
        created_at: serverTimestamp()
    });
    btn.innerText = "✅ შეკვეთა გაიგზავნა!";
});