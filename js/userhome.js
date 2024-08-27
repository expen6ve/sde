import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

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

/// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);


// Handle genre dropdown redirection
const genreDropdownItems = document.querySelectorAll('#genreDropdown .dropdown-item');
genreDropdownItems.forEach(item => {
    item.addEventListener('click', (event) => {
        event.preventDefault(); // Prevent default link behavior
        const selectedGenre = event.target.getAttribute('data-genre');
        if (selectedGenre) {
            window.location.href = `genre.html?genre=${encodeURIComponent(selectedGenre)}`;
        }
    });
});

// Function to update profile icon and dropdown based on user role
function updateProfile(user) {
    const profileIcon = document.querySelector('#profileDropdown img');
    const roleBasedItem = document.getElementById('roleBasedItem');

    if (user) {
        const userRef = ref(database, 'users/' + user.uid);
        get(userRef).then((snapshot) => {
            if (snapshot.exists()) {
                const userData = snapshot.val();
                const profilePictureUrl = userData.profilePicture;
                const userRole = userData.role; // Assuming role is stored as 'role' in the database

                // Update profile picture if it exists
                if (profilePictureUrl) {
                    profileIcon.src = profilePictureUrl;
                }

                // Always add the "Purchases" item
                let dropdownItems = '<a class="dropdown-item" href="purchases.html">Purchases</a>';

                // Conditionally add the "My Listings" item for sellers
                if (userRole === "seller") {
                    dropdownItems += '<a class="dropdown-item" href="my-listings.html">My Listings</a>';
                }

                // Set the dropdown content
                roleBasedItem.innerHTML = dropdownItems;
            }
        }).catch((error) => {
            console.error("Error fetching user data:", error);
        });
    }
}

// Sign-out functionality
function handleSignOut() {
    signOut(auth).then(() => {
        window.location.href = 'index.html'; // Redirect to your landing page
    }).catch((error) => {
        console.error("Error signing out:", error);
    });
}

// Listen for auth state changes
onAuthStateChanged(auth, (user) => {
    if (user) {
        updateProfile(user);
    } else {
        console.log("No user is signed in.");
    }
});

// Attach the sign-out function to the dropdown link
document.addEventListener('DOMContentLoaded', function () {
    const signOutLink = document.getElementById('signOut');
    signOutLink.addEventListener('click', handleSignOut);

    // Read More functionality for cards
    const readMoreLinks = document.querySelectorAll('.read-more');
    readMoreLinks.forEach(link => {
        link.addEventListener('click', function () {
            const cardText = this.previousElementSibling;
            if (cardText.classList.contains('text-hidden')) {
                cardText.classList.remove('text-hidden');
                this.textContent = 'Read Less';
            } else {
                cardText.classList.add('text-hidden');
                this.textContent = 'Read More';
            }
        });
    });
});
