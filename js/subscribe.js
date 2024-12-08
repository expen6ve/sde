import { getDatabase, ref, set, get, update } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js";
import { checkAuth } from "./auth.js"; // Ensure this path matches your project structure
import { initializeNavbar, handleSignOut } from './navbar.js';

document.addEventListener("DOMContentLoaded", () => {
    const subscribeButton = document.getElementById("subscribeButton");
    const signOutButton = document.getElementById('signOut');

    // Initialize sign-out button event listener once the DOM is loaded
    if (signOutButton) {
        signOutButton.addEventListener('click', handleSignOut);
    }

    subscribeButton.addEventListener("click", async () => {
        // Retrieve the current user
        const user = await checkAuth();
        if (!user) {
            window.location.href = 'index.html'; // Redirect if not logged in
            return;
        }

        initializeNavbar();
    
        const userId = user.uid;

        // Firebase database setup
        const database = getDatabase();
        const subscriptionRef = ref(database, `subscription/${userId}`);
        const userRef = ref(database, `users/${userId}`);

        try {
            // Check for existing subscription
            const snapshot = await get(subscriptionRef);
            if (snapshot.exists()) {
                const subscriptionData = snapshot.val();
                const { subStatus, timestamp, expireDate } = subscriptionData;

                if (subStatus === "pending") {
                    alert("You have already subscribed and are awaiting confirmation.");
                    return;
                }

                if (subStatus === "subscribed") {
                    const subscriptionDate = new Date(timestamp);
                    const expirationDate = new Date(expireDate);

                    alert(`You are already subscribed since ${subscriptionDate.toDateString()}, will expire on ${expirationDate.toDateString()}.`);
                    return;
                }
            }

            // Get input values
            const transactionRef = document.getElementById("transactionRef").value;
            const fileInput = document.getElementById("bookImage");
            const file = fileInput.files[0];

            if (!transactionRef || !file) {
                alert("Please provide both the transaction reference number and an image.");
                return;
            }

            // Step 1: Upload the image to Firebase Storage
            const storage = getStorage();
            const imagePath = `subscriptions/${userId}/${file.name}`;
            const imageRef = storageRef(storage, imagePath);
            await uploadBytes(imageRef, file);
            const imageUrl = await getDownloadURL(imageRef);

            // Step 2: Save the new subscription in Firebase Realtime Database
            const currentDate = new Date();
            const expireDate = new Date();
            expireDate.setMonth(currentDate.getMonth() + 1);

            const subscriptionData = {
                transactionRef,
                subStatus: "pending",
                imageUrl,
                timestamp: currentDate.toISOString(),
                expireDate: expireDate.toISOString()
            };

            await set(subscriptionRef, subscriptionData);

            // Step 3: Update the user's node with a copy of the subscription status
            await update(userRef, {
                subStatus: subscriptionData.subStatus
            });

            // Success message and redirection
            alert("Subscription details submitted successfully!");
            window.location.href = "sellingform.html"; // Redirect to selling form
        } catch (error) {
            console.error("Error checking or submitting subscription details:", error);
            alert("An error occurred while processing your subscription. Please try again.");
        }
    });
});

