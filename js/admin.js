import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

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
const auth = getAuth(app);
const database = getDatabase(app);

// Get the logout button
const logoutButton = document.getElementById("logoutButton");

// Function to check if the user is an admin
async function checkAdminAccess(user) {
    const userRef = ref(database, `users/${user.uid}`);
    const snapshot = await get(userRef);

    if (snapshot.exists()) {
        const userData = snapshot.val();

        // Check if the user has 'admin' role
        if (userData.role !== "admin") {
            // If the user is not an admin, redirect to a non-admin page (e.g., home)
            window.location.href = "index.html"; // Or any other non-admin page
        }
    } else {
        // If user data doesn't exist, assume no access
        window.location.href = "login.html";
    }
}

// Firebase listener for auth state
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Check if the logged-in user has admin role
        checkAdminAccess(user);
    } else {
        // If no user is logged in, redirect to login page
        window.location.href = "login.html";
    }
});

// Function to handle logout
logoutButton.addEventListener("click", async (e) => {
    e.preventDefault(); // Prevent default link behavior

    try {
        // Log out the user
        await signOut(auth);
        console.log("User signed out successfully.");

        // Redirect to the login page
        window.location.href = "login.html";
    } catch (error) {
        console.error("Error during sign out:", error);
        alert("An error occurred while logging out. Please try again.");
    }
});
