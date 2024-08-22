// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCN8NcVQNRjAF_A86a8NfxC9Audivokuso",
  authDomain: "sde-ecoread.firebaseapp.com",
  projectId: "sde-ecoread",
  storageBucket: "sde-ecoread.appspot.com",
  messagingSenderId: "137637739158",
  appId: "1:137637739158:web:c9b885cf9025c89e2c60b7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
const auth = getAuth();
const db = getDatabase();

// Wait for the DOM to load before accessing elements
document.addEventListener("DOMContentLoaded", () => {
  const submitButton = document.getElementById("submit");

  // Attach an event listener to the submit button
  submitButton.addEventListener("click", function(event) {
    event.preventDefault(); // Prevent form submission

    // Get the email and password entered by the user
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    // Sign in with Firebase Authentication
    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        // Signed in successfully
        const user = userCredential.user;
        alert(`Welcome ${user.email}! You are now logged in.`);
        // You can redirect or perform other actions here
      })
      .catch((error) => {
        // Handle errors
        const errorCode = error.code;
        const errorMessage = error.message;
        alert(`Error: ${errorMessage}`);
      });
  });
});
