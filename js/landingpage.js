import { checkAuth } from './auth.js';
import { getDatabase, ref, update } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";

// Get the buyer and seller links
const buyerLink = document.getElementById("buyer-link");
const sellerLink = document.getElementById("seller-link");

// Listen for the user's choice
buyerLink.addEventListener("click", () => setRoleAndRedirect("buyer"));
sellerLink.addEventListener("click", () => setRoleAndRedirect("seller"));

// Function to set role in Firebase and redirect to the login page
async function setRoleAndRedirect(role) {
    const user = await checkAuth();
    if (user) {
        // User is signed in
        const database = getDatabase(); // Get the database instance
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
        // User is not signed in
        alert("User not found. Please log in.");
    }
}
