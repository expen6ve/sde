import { getDatabase, ref, get, onValue } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { removeLoginStatus } from './auth.js'; 
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
            dropdownItems += '<a class="dropdown-item" href="changepassemail.html">Change Password or Email</a>';
            if (role === "seller") {
                dropdownItems += '<a class="dropdown-item" href="my-listings.html">My Listings</a>';
            }
            
            // Update role-based item in the dropdown
            roleBasedItem.innerHTML = dropdownItems;
        }
    }).catch(error => console.error("Error fetching user data:", error));
}

export function handleSignOut() {
    const user = auth.currentUser; // Get the current user before signing out

    if (user) {
        // Remove the user from the logged-in list
        removeLoginStatus(user)
            .then(() => {
                // Sign out after successfully removing the user status
                return signOut(auth);
            })
            .then(() => {
                // Redirect to the index page after sign-out
                window.location.href = 'index.html';
            })
            .catch(error => console.error("Error signing out or updating database:", error));
    } else {
        console.error("No user is currently signed in.");
    }
}

function handleGenreDropdownClick(event) {
    event.preventDefault(); // Prevent the default anchor click behavior
    const selectedGenre = event.target.getAttribute('data-genre');
    if (selectedGenre) {
        // Change the window location to redirect correctly
        window.location.href = `genre.html?genre=${encodeURIComponent(selectedGenre)}#`;
    }
}

// Setup navbar event listeners
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
        updateUnreadMessageCount(user); // Initialize the unread message count
    }
    setupNavbarEventListeners();
}


export function updateUnreadMessageCount(currentUser) {
    const messagesLink = document.getElementById('messagesLink');
    const chatsRef = ref(database, 'chats/');

    if (!messagesLink) return;

    onValue(chatsRef, (snapshot) => {
        const allChats = snapshot.val();
        let unreadCount = 0;

        if (allChats) {
            Object.keys(allChats).forEach(chatKey => {
                if (chatKey.includes(currentUser.uid)) {
                    const chatMessages = allChats[chatKey];
                    Object.values(chatMessages).forEach(msg => {
                        if (msg.receiver === currentUser.uid && !msg.read) {
                            unreadCount++;
                        }
                    });
                }
            });
        }

        // Update the link text with the unread message count styled in red
        if (unreadCount > 0) {
            messagesLink.innerHTML = `Messages <span style="color: red; font-weight: bold;">(${unreadCount})</span>`;
        } else {
            messagesLink.textContent = 'Messages'; // Revert to default text
        }
    });
}
