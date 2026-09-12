import { db } from "./firebase-config.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

const actionBtn = document.getElementById("action-btn");
const centerPin = document.getElementById("center-pin");
const searchInput = document.getElementById("search-input");
const searchBtn = document.getElementById("search-btn");

// CartoDB ნათელი თემა
const map = L.map('map', { zoomControl: false }).setView([42.1795, 42.9786], 15);
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);

let currentLat = null, currentLng = null; // A წერტილი
let destLat = null, destLng = null;       // B წერტილი
let routingControl = null;
let appState = "SELECT_DESTINATION"; // მდგომარეობები: SELECT_DESTINATION -> CONFIRM_ORDER

// 1. მგზავრის ლოკაციის პოვნა (A წერტილი)
if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(position => {
        currentLat = position.coords.latitude;
        currentLng = position.coords.longitude;
        map.setView([currentLat, currentLng], 16);
        
        // ვსვამთ პატარა ლურჯ წერტილს მგზავრის ლოკაციაზე
        L.circleMarker([currentLat, currentLng], { color: '#3498db', radius: 8, fillOpacity: 1 }).addTo(map);
    });
}

// 2. რუკის გამოძრავების ანიმაცია (პინი ხტება)
map.on('movestart', () => centerPin.classList.add('moving'));
map.on('moveend', () => centerPin.classList.remove('moving'));

// 3. მთავარი ღილაკის ლოგიკა
actionBtn.addEventListener("click", async () => {
    if (appState === "SELECT_DESTINATION") {
        // ვიღებთ რუკის ზუსტ ცენტრს (სადაც პინია გაჩერებული)
        const center = map.getCenter();
        destLat = center.lat;
        destLng = center.lng;

        // ვმალავთ ცენტრალურ პინს და ვხატავთ მარშრუტს A-დან B-მდე
        centerPin.style.display = "none";
        
        routingControl = L.Routing.control({
            waypoints: [
                L.latLng(currentLat, currentLng),
                L.latLng(destLat, destLng)
            ],
            routeWhileDragging: false,
            addWaypoints: false,
            show: false // მარცხენა პანელის დამალვა
        }).addTo(map);

        actionBtn.innerText = "🚕 ტაქსის გამოძახება";
        actionBtn.style.backgroundColor = "#27ae60";
        appState = "CONFIRM_ORDER";

    } else if (appState === "CONFIRM_ORDER") {
        // ვაგზავნით მონაცემებს Firebase-ში
        actionBtn.innerText = "⏳ მძღოლი იძებნება...";
        actionBtn.disabled = true;

        await addDoc(collection(db, "Rides"), {
            passenger_id: "passenger_001",
            status: "pending",
            pickup: { lat: currentLat, lng: currentLng },
            destination: { lat: destLat, lng: destLng },
            price_to_pay: 3.00,
            system_fee: 0.40,
            created_at: serverTimestamp()
        });
        
        actionBtn.innerText = "✅ შეკვეთა გაიგზავნა!";
    }
});

// 4. საძიებო ველის ლოგიკა (OpenStreetMap API)
searchBtn.addEventListener("click", async () => {
    const query = searchInput.value;
    if (!query) return;
    
    // ვეძებთ ქართულად
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}, Georgia`);
    const data = await res.json();
    
    if (data.length > 0) {
        const lat = data[0].lat;
        const lon = data[0].lon;
        map.setView([lat, lon], 16); // გადაგვაქვს რუკა ნაპოვნ მისამართზე
    } else {
        alert("მისამართი ვერ მოიძებნა");
    }
});