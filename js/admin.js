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

// Function to restrict access based on role
async function restrictAccess() {
    const user = auth.currentUser;

    if (!user) {
        // If user is not logged in, redirect to login page
        window.location.href = "login.html";
        return;
    }

    try {
        // Get the user's role from the database
        const userRef = ref(database, `users/${user.uid}`);
        const userSnapshot = await get(userRef);

        if (!userSnapshot.exists()) {
            throw new Error("User data not found in the database.");
        }

        const userData = userSnapshot.val();
        const userRole = userData.role;

        // Check the user's role
        if (userRole === "buyer" || userRole === "seller") {
            window.location.href = "userhome.html"; // Redirect to an unauthorized page
        }
    } catch (error) {
        console.error("Error checking user role:", error.message);
        alert("An error occurred while checking permissions.");
        window.location.href = "login.html"; // Redirect to login if there's an issue
    }
}

// Listen for authentication state changes and restrict access
onAuthStateChanged(auth, (user) => {
    if (user) {
        restrictAccess();
        console.log("The logged in user is:", user.email);
    } else {
        window.location.href = "login.html";
    }
});
// Get the logout button
const logoutButton = document.getElementById("logoutButton");


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
