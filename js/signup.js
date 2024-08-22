// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCN8NcVQNRjAF_A86a8NfxC9Audivokuso",
  authDomain: "sde-ecoread.firebaseapp.com",
  databaseURL: "https://sde-ecoread-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "sde-ecoread",
  storageBucket: "sde-ecoread.appspot.com",
  messagingSenderId: "137637739158",
  appId: "1:137637739158:web:c9b885cf9025c89e2c60b7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

// Get form references
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const firstNameInput = document.getElementById("first-name");
const lastNameInput = document.getElementById("last-name");
const ageInput = document.getElementById("age");
const genderInputs = document.getElementsByName("gender");
const phoneInput = document.getElementById("phone-number");
const streetInput = document.getElementById("street");
const barangayInput = document.getElementById("barangay");
const zipCodeInput = document.getElementById("zip-code");
const cityInput = document.getElementById("city");
const provinceInput = document.getElementById("province");
const termsCheckbox = document.getElementById("terms");
const registerButton = document.querySelector("button[type='submit']");
const continueButton = document.getElementById("continueButton");

// Register event listener for form submission
registerButton.addEventListener("click", (e) => {
    e.preventDefault(); // Prevent default form submission

    if (!termsCheckbox.checked) {
    alert("You must accept the terms and conditions to register.");
    return;
    }

    const email = emailInput.value;
    const password = passwordInput.value;

    // Ensure the form fields are not empty
    if (!email || !password || !firstNameInput.value || !lastNameInput.value) {
    alert("Please fill out all required fields.");
    return;
    }

    // Create a new user
    createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
        // Signed in successfully
        const user = userCredential.user;

        // Save additional user information to the database
        set(ref(database, 'users/' + user.uid), {
        firstName: firstNameInput.value,
        lastName: lastNameInput.value,
        age: ageInput.value,
        gender: getSelectedGender(),
        phone: phoneInput.value,
        address: {
            street: streetInput.value,
            barangay: barangayInput.value,
            zipCode: zipCodeInput.value,
            city: cityInput.value,
            province: provinceInput.value
        }
        });

        // Show the modal on successful registration
        $('#successModal').modal('show');
    })
    .catch((error) => {
        console.error("Error registering user:", error);
        alert(error.message);
    });
});

// Redirect to login.html when the "Continue" button is clicked
continueButton.addEventListener("click", () => {
    window.location.href = "login.html";
});

// Function to get the selected gender
function getSelectedGender() {
    for (const genderInput of genderInputs) {
    if (genderInput.checked) {
        return genderInput.value;
    }
    }
    return null;
}