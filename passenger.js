import { db } from "./firebase-config.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

const callTaxiBtn = document.getElementById("call-taxi-btn");
const locationStatus = document.getElementById("location-status");

// 1. რუკის ინიციალიზაცია (ცენტრი საწყის ეტაპზე თერჯოლაზე)
const map = L.map('map', { zoomControl: false }).setView([42.1795, 42.9786], 14);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
}).addTo(map);

// მარკერი, რომელიც აჩვენებს მგზავრის ლოკაციას
let userMarker = null;
let currentLat = null;
let currentLng = null;

const testPassengerId = "passenger_001"; 

// 2. მომხმარებლის GPS ლოკაციის წამოღება
if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(
        (position) => {
            currentLat = position.coords.latitude;
            currentLng = position.coords.longitude;

            // რუკის გადატანა მომხმარებლის ლოკაციაზე
            map.setView([currentLat, currentLng], 16);
            
            // მარკერის დასმა
            userMarker = L.marker([currentLat, currentLng]).addTo(map)
                .bindPopup("თქვენ აქ ხართ!").openPopup();

            // ღილაკის გააქტიურება
            callTaxiBtn.disabled = false;
            callTaxiBtn.innerHTML = "🚕 ტაქსის გამოძახება";
            locationStatus.innerText = "";
            locationStatus.style.color = "green";
        },
        (error) => {
            console.error("GPS შეცდომა:", error);
            locationStatus.innerText = "ვერ ვპოულობთ ლოკაციას. ჩართეთ GPS.";
            callTaxiBtn.innerHTML = "ლოკაცია მიუწვდომელია";
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
} else {
    locationStatus.innerText = "თქვენი ბრაუზერი არ უჭერს მხარს GPS-ს.";
}

// 3. ტაქსის გამოძახების ლოგიკა
callTaxiBtn.addEventListener("click", async () => {
    if (!currentLat || !currentLng) {
        alert("ლოკაცია ჯერ არ არის ნაპოვნი!");
        return;
    }

    try {
        // ღილაკის ანიმაცია და სტატუსის შეცვლა
        callTaxiBtn.disabled = true;
        callTaxiBtn.innerHTML = "⏳ იძებნება მძღოლი...";
        callTaxiBtn.style.backgroundColor = "#e67e22";

        // Firebase-ში გაგზავნა რეალური კოორდინატებით
        const docRef = await addDoc(collection(db, "Rides"), {
            passenger_id: testPassengerId,
            status: "pending",
            price_to_pay: 3.00,
            system_fee: 0.40,
            fee_deducted: false,
            pickup_location: {
                lat: currentLat,
                lng: currentLng
            },
            created_at: serverTimestamp()
        });

        callTaxiBtn.innerHTML = "✅ შეკვეთა გაიგზავნა!";
        callTaxiBtn.style.backgroundColor = "#27ae60";

    } catch (e) {
        console.error("შეცდომა: ", e);
        callTaxiBtn.disabled = false;
        callTaxiBtn.innerHTML = "🚕 ტაქსის გამოძახება";
        alert("შეცდომა, სცადეთ თავიდან.");
    }
});