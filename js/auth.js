import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, sendPasswordResetEmail, updatePassword } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getDatabase, ref, set, remove, increment } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyCN8NcVQNRjAF_A86a8NfxC9Audivokuso",
    authDomain: "sde-ecoread.firebaseapp.com",
    databaseURL: "https://sde-ecoread-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "sde-ecoread",
    storageBucket: "sde-ecoread.appspot.com",
    messagingSenderId: "137637739158",
    appId: "1:137637739158:web:c9b885cf9025c89e2c60b7"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

// Function to update login status and track sessions
function updateLoginStatus(user) {
    const userRef = ref(database, `logged-in-users/${user.uid}`);
    set(userRef, {
        email: user.email,
        loginTime: new Date().toISOString()
    });

    // Track daily session count
    const currentDate = new Date().toISOString().split('T')[0];  // Get current date in YYYY-MM-DD format
    const dailySessionRef = ref(database, `sessions/${currentDate}`);
    set(dailySessionRef, increment(1)); // Increment session count for today
}

// Function to remove user from logged-in list on logout
export function removeLoginStatus(user) {
    const userRef = ref(database, `logged-in-users/${user.uid}`);
    return remove(userRef); // Return the Promise from remove()
}

// Track User Logins and Logouts
onAuthStateChanged(auth, (user) => {
    if (user && user.emailVerified) {
        updateLoginStatus(user); // Record login if the user is verified
    } else if (!user) {
        // Remove login status when the user logs out
        const currentUser = auth.currentUser;
        if (currentUser) {
            removeLoginStatus(currentUser);
        }
    }
});

// Check user authentication with email verification
export function checkAuth() {
    return new Promise((resolve) => {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                if (user.emailVerified) {
                    resolve(user); // User is verified, allow them to proceed
                } else {
                    console.log("Account Not Verified");
                    resolve(null); // Deny login for unverified users
                }
            } else {
                resolve(null); // No user is logged in
            }
        });
    });
}

// Function to check and restrict access to specific pages
export function restrictAccess() {
    const currentUrl = window.location.href;
    const unrestrictedPages = ['genre.html']; // Pages everyone can access freely
    const genreSubPages = currentUrl.includes("genre.html?genre="); // Check for genre subpages
    const restrictedForLoggedIn = ['index.html', 'login.html', 'signup.html']; // Pages restricted for logged-in users

    // Allow access to unrestricted pages and genre subpages
    if (unrestrictedPages.some(page => currentUrl.includes(page)) || genreSubPages) {
        return; // Allow access
    }

    // Check if the page is restricted for logged-in users
    if (restrictedForLoggedIn.some(page => currentUrl.includes(page))) {
        // Check if the user is logged in
        checkAuth().then(user => {
            if (user) {
                // User is logged in, redirect to a genre page
                window.location.href = 'userhome.html';
            }
        });
    } else {
        // Check if the user is authenticated for all other pages
        checkAuth().then(user => {
            if (!user) {
                // User is not authenticated, redirect to index.html
                window.location.href = 'index.html';
            }
        });
    }
}

// Call restrictAccess on every page load
restrictAccess();

// Update password in Firebase Authentication and Database
export async function updatePasswordInFirebase(user, newPassword) {
    try {
        const auth = getAuth();
        const currentUser = auth.currentUser;

        // Update password in Firebase Authentication
        await updatePassword(currentUser, newPassword);

        // Update password in Firebase Realtime Database (if stored there too)
        const db = getDatabase();
        const userRef = ref(db, 'users/' + currentUser.uid);
        await update(userRef, {
            password: newPassword // Assuming the password is stored here
        });

    } catch (error) {
        console.error('Error updating password in Firebase:', error);
        throw error;
    }
}

export { auth, signInWithEmailAndPassword, sendPasswordResetEmail };
