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

let map, directionsService, directionsRenderer;
let appState = "PICKUP"; 
let pickupCoords = null;
let destCoords = null;
let currentRideId = null;
let unsubscribeRide = null;
let calculatedPrice = 3.00;

// ავტორიზაციის შემოწმება
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

// ===================== Google Maps ლოგიკა =====================
function initMap() {
    if (!map) {
        // საწყისი კოორდინატები
        const initialLocation = { lat: 42.1795, lng: 42.9786 }; 

        map = new google.maps.Map(document.getElementById("map"), {
            center: initialLocation,
            zoom: 15,
            disableDefaultUI: true, // ვთიშავთ ზედმეტ ღილაკებს სუფთა დიზაინისთვის
            styles: [
                { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] } // ვმალავთ ზედმეტ ობიექტებს
            ]
        });

        directionsService = new google.maps.DirectionsService();
        directionsRenderer = new google.maps.DirectionsRenderer({
            map: map,
            suppressMarkers: false
        });
        
        // რუკის გამოძრავებისას პინის ანიმაცია
        map.addListener('dragstart', () => centerPin.classList.add('moving'));
        map.addListener('idle', () => centerPin.classList.remove('moving'));
        
        // GPS პოვნა
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(pos => {
                map.setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                map.setZoom(16);
            });
        }
    }
}

mainBtn.addEventListener("click", async () => {
    // Google Maps-დან ვიღებთ რუკის ცენტრს
    const center = map.getCenter();
    const currentLat = center.lat();
    const currentLng = center.lng();

    if (appState === "PICKUP") {
        pickupCoords = { lat: currentLat, lng: currentLng };
        appState = "DESTINATION";
        
        panelTitle.innerText = "სად მიდიხართ?";
        panelSubtitle.innerText = "მონიშნეთ დანიშნულების წერტილი";
        mainBtn.innerText = "📍 მარშრუტის დახატვა";
        cancelBtn.style.display = "block";
        
    } else if (appState === "DESTINATION") {
        destCoords = { lat: currentLat, lng: currentLng };
        appState = "ROUTE";
        
        centerPin.style.display = "none";
        mainBtn.disabled = true;
        mainBtn.innerText = "⏳ ითვლება მარშრუტი...";
        
        // Google Maps Directions API-ით მარშრუტის დათვლა
        const request = {
            origin: pickupCoords,
            destination: destCoords,
            travelMode: 'DRIVING'
        };

        directionsService.route(request, (result, status) => {
            if (status == 'OK') {
                directionsRenderer.setDirections(result);
                
                // დისტანციის და დროის ამოღება
                const leg = result.routes[0].legs[0];
                const distanceKm = (leg.distance.value / 1000).toFixed(1);
                const timeMin = Math.round(leg.duration.value / 60);
                
                calculatedPrice = (2.00 + (distanceKm * 1.00)).toFixed(2);
                
                document.getElementById("route-dist").innerText = `${distanceKm} კმ`;
                document.getElementById("route-time").innerText = `${timeMin} წთ`;
                document.getElementById("route-price").innerText = `${calculatedPrice} ₾`;
                
                routeInfo.style.display = "flex";
                
                panelTitle.innerText = "ტაქსის გამოძახება";
                panelSubtitle.innerText = "გადაამოწმეთ მარშრუტი და ფასი";
                mainBtn.disabled = false;
                mainBtn.innerText = "🚕 გამოძახება";
            } else {
                alert("მარშრუტი ვერ მოიძებნა!");
                cancelBtn.click();
            }
        });
        
    } else if (appState === "ROUTE") {
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
            
            unsubscribeRide = onSnapshot(doc(db, "Rides", currentRideId), (docSnap) => {
                const data = docSnap.data();
                if (data && data.status === "accepted") {
                    appState = "ACCEPTED";
                    panelTitle.innerText = "🎉 მძღოლი მოემართება!";
                    panelSubtitle.innerText = "შეკვეთა მიღებულია. დაელოდეთ ტაქსის.";
                    mainBtn.innerText = "✅ წარმატებული";
                    mainBtn.style.backgroundColor = "#27ae60";
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

cancelBtn.addEventListener("click", () => {
    appState = "PICKUP";
    centerPin.style.display = "block";
    routeInfo.style.display = "none";
    cancelBtn.style.display = "none";
    
    directionsRenderer.setDirections({routes: []}); // რუკის გასუფთავება ხაზისგან
    
    panelTitle.innerText = "საიდან მივდივართ?";
    panelSubtitle.innerText = "მონიშნეთ საწყისი ლოკაცია";
    mainBtn.disabled = false;
    mainBtn.innerText = "📍 დადასტურება";
});