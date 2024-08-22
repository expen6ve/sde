import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const auth = getAuth();
const db = getFirestore(); // Initialize Firestore

document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector("form");

    form.addEventListener("submit", (event) => {
        event.preventDefault();

        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        createUserWithEmailAndPassword(auth, email, password)
            .then(async (userCredential) => {
                // Signed up successfully
                const user = userCredential.user;

                // Store user data in Firestore
                try {
                    await setDoc(doc(db, "users", user.uid), {
                        email: user.email,
                        createdAt: new Date()
                    });
                    alert("User created and stored successfully!");
                } catch (error) {
                    console.error("Error adding user to Firestore: ", error);
                }
            })
            .catch((error) => {
                const errorMessage = error.message;
                alert("Error: " + errorMessage);
            });
    });
});
