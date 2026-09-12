import { db } from "./firebase-config.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

const callTaxiBtn = document.getElementById("call-taxi-btn");
const statusMsg = document.getElementById("status-msg");

// მგზავრის სატესტო ID (რეალურ ვერსიაში ეს ავტორიზაციის შემდეგ მოენიჭება)
const testPassengerId = "passenger_001"; 

callTaxiBtn.addEventListener("click", async () => {
    try {
        callTaxiBtn.disabled = true;
        callTaxiBtn.innerText = "იძებნება მძღოლი...";
        statusMsg.innerText = "გთხოვთ დაელოდოთ...";

        // ვამატებთ ახალ ჩანაწერს Rides კოლექციაში
        const docRef = await addDoc(collection(db, "Rides"), {
            passenger_id: testPassengerId,
            status: "pending",         // სტატუსი: მოლოდინში
            price_to_pay: 3.00,        // სატესტო ფასი
            system_fee: 0.40,          // ჩვენი საკომისიო (40 თეთრი)
            fee_deducted: false,       // ჯერ არ ჩამოჭრილა
            created_at: serverTimestamp() // დროის შტამპი
        });

        statusMsg.innerText = "შეკვეთა გაიგზავნა! შეკვეთის ID: " + docRef.id;
        statusMsg.style.color = "green";

    } catch (e) {
        console.error("შეცდომა მონაცემის დამატებისას: ", e);
        statusMsg.innerText = "შეცდომა: შეკვეთა ვერ გაიგზავნა.";
        statusMsg.style.color = "red";
        callTaxiBtn.disabled = false;
        callTaxiBtn.innerText = "🚕 ტაქსის გამოძახება";
    }
});