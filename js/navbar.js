import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { checkAuth } from './auth.js';

// Firebase initialization
const database = getDatabase();
const auth = getAuth();

// DOM elements
const profileIcon = document.querySelector('#profileDropdown img');
const roleBasedItem = document.getElementById('roleBasedItem');
const signOutLink = document.getElementById('signOut');
const genreDropdownItems = document.querySelectorAll('#genreDropdown .dropdown-item');

console.log('navbar.js loaded');

// Functions
export function updateProfile(user) {
    const userRef = ref(database, `users/${user.uid}`);
    get(userRef).then(snapshot => {
        if (snapshot.exists()) {
            const { profilePicture, role } = snapshot.val();

            // Update profile picture
            if (profilePicture) profileIcon.src = profilePicture;

            // Prepare dropdown items
            let dropdownItems = '<a class="dropdown-item" href="manage-account.html">Manage Account</a>';
            dropdownItems += '<a class="dropdown-item" href="purchases.html">Purchases</a>';
            dropdownItems += '<a class="dropdown-item" href="favorites.html">Favorites</a>';
            if (role === "seller") {
                dropdownItems += '<a class="dropdown-item" href="my-listings.html">My Listings</a>';
            }

            // Update role-based item in the dropdown
            roleBasedItem.innerHTML = dropdownItems;
        }
    }).catch(error => console.error("Error fetching user data:", error));
}

export function handleSignOut() {
    signOut(auth).then(() => window.location.href = 'index.html')
        .catch(error => console.error("Error signing out:", error));
}

function handleGenreDropdownClick(event) {
    event.preventDefault();
    const selectedGenre = event.target.getAttribute('data-genre');
    if (selectedGenre) window.location.href = `genre.html?genre=${encodeURIComponent(selectedGenre)}`;
}

export function setupNavbarEventListeners() {
    genreDropdownItems.forEach(item => item.addEventListener('click', handleGenreDropdownClick));
    signOutLink.addEventListener('click', handleSignOut);
}

// Listen for auth state changes
onAuthStateChanged(auth, user => {
    if (user) {
        updateProfile(user);
    } else {
        console.log("No user is signed in.");
    }
});

export async function initializeNavbar() {
    const user = await checkAuth();
    if (user) {
        updateProfile(user);
    }
    setupNavbarEventListeners();
}


