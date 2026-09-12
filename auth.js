import { app } from "./firebase-config.js"; // დარწმუნდი რომ firebase-config.js-ში export const app = initializeApp(...) გიწერია
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";

const auth = getAuth(app);
auth.languageCode = 'ka'; // ქართული ენა SMS-ისთვის

const phoneInput = document.getElementById("phone-input");
const sendCodeBtn = document.getElementById("send-code-btn");
const codeInput = document.getElementById("code-input");
const verifyCodeBtn = document.getElementById("verify-code-btn");
const errorMsg = document.getElementById("error-msg");

const phoneSection = document.getElementById("phone-section");
const codeSection = document.getElementById("code-section");

let confirmationResult = null;

// ვქმნით reCAPTCHA-ს (აუცილებელია ტელეფონით ავტორიზაციისთვის)
const setupRecaptcha = () => {
    window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'normal',
        'callback': (response) => {
            // reCAPTCHA წარმატებით გაიარა
            sendCodeBtn.disabled = false;
        }
    });
    window.recaptchaVerifier.render();
};

setupRecaptcha();

// 1. SMS-ის გაგზავნა
sendCodeBtn.addEventListener("click", () => {
    const phoneNumber = phoneInput.value.trim();
    if (phoneNumber.length < 12) {
        errorMsg.innerText = "ჩაწერეთ სწორი ნომერი (+995...)";
        return;
    }
    
    errorMsg.innerText = "";
    sendCodeBtn.disabled = true;
    sendCodeBtn.innerText = "იგზავნება...";

    signInWithPhoneNumber(auth, phoneNumber, window.recaptchaVerifier)
        .then((result) => {
            confirmationResult = result;
            phoneSection.style.display = "none";
            codeSection.style.display = "block";
        }).catch((error) => {
            console.error("SMS შეცდომა:", error);
            errorMsg.innerText = "კოდის გაგზავნა ვერ მოხერხდა. სცადეთ თავიდან.";
            window.recaptchaVerifier.render().then(widgetId => grecaptcha.reset(widgetId));
            sendCodeBtn.disabled = false;
            sendCodeBtn.innerText = "SMS კოდის გაგზავნა";
        });
});

// 2. კოდის დადასტურება
verifyCodeBtn.addEventListener("click", () => {
    const code = codeInput.value.trim();
    if (code.length !== 6) {
        errorMsg.innerText = "კოდი უნდა შეიცავდეს 6 ციფრს";
        return;
    }

    verifyCodeBtn.disabled = true;
    verifyCodeBtn.innerText = "მოწმდება...";

    confirmationResult.confirm(code).then((result) => {
        const user = result.user;
        const role = localStorage.getItem('userRole');
        
        // აქ შეგვიძლია Firebase ბაზაშიც ჩავწეროთ იუზერი მისი UID-ით
        
        // სწორ გვერდზე გადამისამართება
        if (role === 'driver') {
            window.location.href = "driver.html";
        } else {
            window.location.href = "index.html"; // მგზავრის მთავარი გვერდი
        }
    }).catch((error) => {
        console.error("კოდი არასწორია:", error);
        errorMsg.innerText = "არასწორი კოდი!";
        verifyCodeBtn.disabled = false;
        verifyCodeBtn.innerText = "შესვლა";
    });
});