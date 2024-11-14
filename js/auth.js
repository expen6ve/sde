import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";

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

// Modified checkAuth function to include email verification check
export function checkAuth() {
    return new Promise((resolve) => {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                if (user.emailVerified) {
                    resolve(user); // User is verified, allow them to proceed
                } else {
                    console.log("Account Not Verified")
                    resolve(null); // Deny login for unverified users
                }
            } else {
                resolve(null); // No user is logged in
            }
        });
    });
}

export { auth, signInWithEmailAndPassword, sendPasswordResetEmail };
