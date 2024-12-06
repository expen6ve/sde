import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getDatabase, ref, update } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";

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

// Get Database Instance
const database = getDatabase(app);

// User ID of the admin
const userId = "rUyyshozoAMNyuXJ0HHpdRg4LL33";

// Function to set the user as an admin
async function setAdmin() {
    const userRef = ref(database, `users/${userId}`);
    try {
        await update(userRef, {
            role: "admin" // or isAdmin: true
        });
        console.log(`User ${userId} is now an admin.`);
    } catch (error) {
        console.error("Error updating admin status:", error);
    }
}

setAdmin();
