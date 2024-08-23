import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getDatabase, ref, update } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

// Firebase configuration
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

// Get the buyer and seller links
const buyerLink = document.getElementById("buyer-link");
const sellerLink = document.getElementById("seller-link");

// Check if the role is already selected
window.onload = function() {
    if (sessionStorage.getItem('roleSelected')) {
        // If role is already selected, redirect to login
        window.location.href = "login.html";
    }

    // Replace the current history state to prevent back navigation
    history.replaceState(null, "", "login.html");
};

// Listen for the user's choice
buyerLink.addEventListener("click", () => setRoleAndRedirect("Buyer"));
sellerLink.addEventListener("click", () => setRoleAndRedirect("Seller"));

// Function to set role in Firebase and redirect to the login page
function setRoleAndRedirect(role) {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // User is signed in
            const userRef = ref(database, 'users/' + user.uid);
            update(userRef, { role: role })
            .then(() => {
                // Store role selection in sessionStorage
                sessionStorage.setItem('roleSelected', 'true');
                
                // Redirect to login page
                window.location.href = "login.html";
            })
            .catch((error) => {
                console.error("Error updating user role:", error);
                alert("An error occurred while saving your role. Please try again.");
            });
        } else {
            // User is not signed in (handle this scenario if necessary)
            alert("User not found. Please log in.");
        }
    });
}