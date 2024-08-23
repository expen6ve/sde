import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";

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
const auth = getAuth(app);
const db = getDatabase(app);

// Get form references  
const emailInput = document.getElementById("emailInput");
const passInput = document.getElementById("passInput");
const loginButton = document.getElementById("loginButton");
const forgotPasswordLink = document.querySelector('a[href="#"]');

// Add event listener for form submission
loginButton.addEventListener("click", async (e) => {
  e.preventDefault(); // Prevent default form submission

  const email = emailInput.value;
  const password = passInput.value;

  if (!email || !password) {
    alert("Please fill out all fields.");
    return;
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log('User logged in:', user);
    
    // Clear the input fields
    emailInput.value = '';
    passInput.value = '';

    // Optionally, redirect the user to a different page after successful login
    window.location.href = 'home.html'; // Change 'home.html' to your desired page
  } catch (error) {
    console.error("Error logging in:", error);
    // Show the error modal
    const errorModal = new bootstrap.Modal(document.getElementById('errorModal'));
    errorModal.show();
    passInput.value = '';
  }
});

// Add event listener for forgot password link
forgotPasswordLink.addEventListener("click", (e) => {
  e.preventDefault();
  const email = emailInput.value;

  if (!email) {
    alert("Please enter your email address.");
    return;
  }

  sendPasswordResetEmail(auth, email)
    .then(() => {
      alert("A password reset link has been sent to your email!");
    })
    .catch((error) => {
      console.error("Error sending password reset email:", error);
      alert("Failed to send password reset email. Please try again.");
    });
});
