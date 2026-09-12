import { db } from "./firebase-config.js";
import { collection, addDoc, serverTimestamp, onSnapshot, doc } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

const authScreen = document.getElementById("auth-screen");
const appScreen = document.getElementById("app-screen");
const centerPin = document.getElementById("center-pin");

const panelTitle = document.getElementById("panel-title");
const panelSubtitle = document.getElementById("panel-subtitle");
const mainBtn = document.getElementById("main-btn");
const cancelBtn = document.getElementById("cancel-btn");
const routeInfo = document.getElementById("route-info");

let map, routingControl;
let appState = "PICKUP"; // ეტაპები: PICKUP -> DESTINATION -> ROUTE -> WAITING -> ACCEPTED
let pickupCoords = null;
let destCoords = null;
let currentRideId = null;
let unsubscribeRide = null; // ბაზის მსმენელი
let calculatedPrice = 3.00;

// ===================== ავტორიზაცია =====================
const savedPhone = localStorage.getItem("passengerPhone");
const savedName = localStorage.getItem("passengerName");

if (savedPhone && savedName) showAppScreen(savedName);
else { authScreen.style.display = "flex"; appScreen.style.display = "none"; }

document.getElementById("login-btn").addEventListener("click", () => {
    const name = document.getElementById("name-input").value.trim();
    const phone = document.getElementById("phone-input").value.trim();
    if (name === "" || phone.length < 9) return alert("შეავსეთ სწორად!");
    localStorage.setItem("passengerName", name);
    localStorage.setItem("passengerPhone", phone);
    showAppScreen(name);
});

function showAppScreen(name) {
    authScreen.style.display = "none";
    appScreen.style.display = "block";
    document.getElementById("display-name").innerText = name;
    document.getElementById("user-avatar").innerText = name.charAt(0).toUpperCase();
    initMap();
}

document.getElementById("logout-btn").addEventListener("click", () => {
    localStorage.clear(); window.location.reload();
});

// ===================== რუკა და ლოგიკა =====================
function initMap() {
    if (!map) {
        map = L.map('map', { zoomControl: false }).setView([42.1795, 42.9786], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
        
        map.on('movestart', () => centerPin.classList.add('moving'));
        map.on('moveend', () => centerPin.classList.remove('moving'));
        
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(pos => {
                map.setView([pos.coords.latitude, pos.coords.longitude], 16);
            });
        }
    }
}

// მთავარი ღილაკის ლოგიკა (ეტაპების მიხედვით)
mainBtn.addEventListener("click", async () => {
    const center = map.getCenter();

    if (appState === "PICKUP") {
        // ეტაპი 1: საწყისი ლოკაცია მონიშნა
        pickupCoords = { lat: center.lat, lng: center.lng };
        appState = "DESTINATION";
        
        panelTitle.innerText = "სად მიდიხართ?";
        panelSubtitle.innerText = "მონიშნეთ დანიშნულების წერტილი";
        mainBtn.innerText = "📍 მარშრუტის დახატვა";
        cancelBtn.style.display = "block"; // გაუქმების გამოჩენა
        
    } else if (appState === "DESTINATION") {
        // ეტაპი 2: დანიშნულება მონიშნა (ვითვლით მანძილს)
        destCoords = { lat: center.lat, lng: center.lng };
        appState = "ROUTE";
        
        centerPin.style.display = "none"; // პინს ვმალავთ
        mainBtn.disabled = true;
        mainBtn.innerText = "⏳ ითვლება მარშრუტი...";
        
        // Leaflet Routing Machine-ით ვხატავთ ხაზს
        routingControl = L.Routing.control({
            waypoints: [ L.latLng(pickupCoords.lat, pickupCoords.lng), L.latLng(destCoords.lat, destCoords.lng) ],
            routeWhileDragging: false,
            addWaypoints: false,
            show: false // მარცხენა პანელის დამალვა
        }).addTo(map);

        // როცა მარშრუტს იპოვის, ვიღებთ კილომეტრებს და დროს
        routingControl.on('routesfound', function(e) {
            const routes = e.routes;
            const summary = routes[0].summary;
            
            const distanceKm = (summary.totalDistance / 1000).toFixed(1); // კილომეტრებში
            const timeMin = Math.round(summary.totalTime / 60); // წუთებში
            
            // ფასის დათვლა: 2 ლარი ჩაჯდომა + 1 ლარი ყოველ კილომეტრზე
            calculatedPrice = (2.00 + (distanceKm * 1.00)).toFixed(2);
            
            document.getElementById("route-dist").innerText = `${distanceKm} კმ`;
            document.getElementById("route-time").innerText = `${timeMin} წთ`;
            document.getElementById("route-price").innerText = `${calculatedPrice} ₾`;
            
            routeInfo.style.display = "flex"; // ვაჩენთ ინფოს
            
            panelTitle.innerText = "ტაქსის გამოძახება";
            panelSubtitle.innerText = "გადაამოწმეთ მარშრუტი და ფასი";
            mainBtn.disabled = false;
            mainBtn.innerText = "🚕 გამოძახება";
        });
        
    } else if (appState === "ROUTE") {
        // ეტაპი 3: შეკვეთის გაგზავნა
        mainBtn.disabled = true;
        mainBtn.innerText = "⏳ ბაზაში იგზავნება...";
        cancelBtn.style.display = "none";

        try {
            const docRef = await addDoc(collection(db, "Rides"), {
                passenger_name: localStorage.getItem("passengerName"),
                passenger_phone: localStorage.getItem("passengerPhone"),
                status: "pending",
                pickup_location: pickupCoords,
                destination_location: destCoords,
                price_to_pay: calculatedPrice,
                system_fee: 0.40,
                created_at: serverTimestamp()
            });
            
            currentRideId = docRef.id;
            appState = "WAITING";
            
            panelTitle.innerText = "⏳ იძებნება მძღოლი...";
            panelSubtitle.innerText = "გთხოვთ დაელოდოთ...";
            mainBtn.innerText = "მძღოლის მოლოდინში...";
            mainBtn.style.backgroundColor = "#95a5a6";
            
            // ეტაპი 4: ბაზის მოსმენა (მიიღო თუ არა მძღოლმა)
            unsubscribeRide = onSnapshot(doc(db, "Rides", currentRideId), (docSnap) => {
                const data = docSnap.data();
                if (data && data.status === "accepted") {
                    appState = "ACCEPTED";
                    panelTitle.innerText = "🎉 მძღოლი მოემართება!";
                    panelSubtitle.innerText = "შეკვეთა მიღებულია. დაელოდეთ ტაქსის.";
                    mainBtn.innerText = "✅ წარმატებული";
                    mainBtn.style.backgroundColor = "#27ae60";
                    // მოსმენის გათიშვა
                    unsubscribeRide();
                }
            });

        } catch (e) {
            console.error(e);
            mainBtn.disabled = false;
            mainBtn.innerText = "❌ შეცდომა";
        }
    }
});

// გაუქმების ღილაკი (აბრუნებს საწყის მდგომარეობაში)
cancelBtn.addEventListener("click", () => {
    appState = "PICKUP";
    centerPin.style.display = "block";
    routeInfo.style.display = "none";
    cancelBtn.style.display = "none";
    
    if (routingControl) map.removeControl(routingControl);
    
    panelTitle.innerText = "საიდან მივდივართ?";
    panelSubtitle.innerText = "მონიშნეთ საწყისი ლოკაცია";
    mainBtn.disabled = false;
    mainBtn.innerText = "📍 დადასტურება";
});