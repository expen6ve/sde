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
    }
    setupNavbarEventListeners();
}


// import { checkAuth } from './auth.js';
// import { getDatabase, ref, onValue, query, orderByChild, get } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";
// import { initializeNavbar, handleSignOut } from './navbar.js';
// import { openChatModal, sendMessage } from './contactseller.js'; // Import contact seller functions

// const database = getDatabase();

// // DOM elements
// const bookListContainer = document.getElementById('bookListContainer');
// const genreDropdownItems = document.querySelectorAll('#genreDropdown + .dropdown-menu .dropdown-item');
// const sortLowestPrice = document.getElementById('sortLowestPrice');
// const sortHighestPrice = document.getElementById('sortHighestPrice');
// const sortMostRecent = document.getElementById('sortMostRecent');
// const genreHeading = document.getElementById('genreHeading');
// const signInButton = document.getElementById('signinbutton');
// const signOutButton = document.getElementById('signOut');
// const searchForm = document.querySelector('form[role="search"]');
// const searchInput = searchForm.querySelector('input');
// let currentUser = null;

// // Initialize Navbar
// document.addEventListener('DOMContentLoaded', async () => {
//     currentUser = await checkAuth();
//     updateUIBasedOnAuth(currentUser);
//     initializeNavbar();
//     displayBooks(getGenre(), null, getSortOrder());

//     if (signOutButton) {
//         signOutButton.addEventListener('click', handleSignOut);
//     }

//     // Add Event Listener to Send Message Button in Modal
//     document.getElementById('sendMessageBtn').addEventListener('click', () => {
//         const messageInput = document.getElementById('messageInput');
//         sendMessage(messageInput);  // Call function from contactseller.js
//     });
// });

// // Helper Functions
// function getGenre() {
//     const urlParams = new URLSearchParams(window.location.search);
//     return urlParams.get('genre');
// }

// function getSortOrder() {
//     return 'dateListed';
// }

// function updateUIBasedOnAuth(user) {
//     if (signInButton) signInButton.style.display = user ? 'none' : 'block';
//     if (signOutButton) signOutButton.style.display = user ? 'block' : 'none';
// }

// function displayBooks(genre = null, searchTerm = null, sortBy = 'dateListed') {
//     const booksRef = ref(database, 'book-listings');
//     let queryRef = booksRef;

//     switch (sortBy) {
//         case 'priceLowToHigh':
//         case 'priceHighToLow':
//             queryRef = query(booksRef, orderByChild('price'));
//             break;
//         case 'dateListed':
//             queryRef = query(booksRef, orderByChild('dateListed'));
//             break;
//     }

//     onValue(queryRef, (snapshot) => {
//         const bookData = snapshot.val();
//         bookListContainer.innerHTML = '';
//         if (bookData) {
//             const userNames = {};
//             onValue(ref(database, 'users'), (userSnapshot) => {
//                 const userData = userSnapshot.val();
//                 if (userData) {
//                     Object.keys(userData).forEach(userId => {
//                         userNames[userId] = userData[userId].firstName || 'Unknown';
//                     });

//                     genreHeading.textContent = searchTerm
//                         ? `Search Results for "${searchTerm}"`
//                         : genre
//                             ? `Books in "${genre}"`
//                             : "All Books";

//                     const sortedBooks = Object.keys(bookData).map(key => ({
//                         id: key,
//                         ...bookData[key]
//                     }));

//                     sortedBooks.sort((a, b) => {
//                         if (sortBy === 'priceHighToLow') return b.price - a.price;
//                         if (sortBy === 'priceLowToHigh') return a.price - b.price;
//                         return new Date(b.dateListed) - new Date(a.dateListed);
//                     });

//                     sortedBooks.forEach(book => {
//                         if ((!genre || book.genre === genre) &&
//                             (!searchTerm || book.title.toLowerCase().includes(searchTerm.toLowerCase()))) {
//                             bookListContainer.innerHTML += `
//                                 <div class="col-lg-3 col-md-6 mb-5">
//                                     <div class="card h-100">
//                                         <div class="card-body">
//                                             <div class="d-flex justify-content-center">
//                                                 <img src="${book.imageUrl || 'images/default-book.png'}" class="img-fluid" alt="Book Image" style="height: 200px; object-fit: cover;">
//                                             </div>
//                                             <div class="d-flex justify-content-center mt-3">
//                                                 <button class="btn custom-btn">Add to Favorites</button>
//                                             </div>
//                                             <h4 class="card-title mt-3 fs-5">${book.title}</h4>
//                                             <p class="card-text"><strong>Author:</strong> ${book.author}</p>
//                                             <p class="card-text"><strong>Seller:</strong> ${userNames[book.userId] || 'Unknown'}</p>
//                                             <p class="card-text"><strong>Condition:</strong> ${book.condition}</p>
//                                             <p class="card-text"><strong>Price:</strong> ₱${book.price}</p>
//                                             <!-- More Info button to open modal -->
//                                             <div class="mt-2 mb-2">
//                                                 <button class="btn btn-primary w-100" onclick="openMoreInfoModal('${book.id}')">More Info</button>
//                                             </div>
//                                             <!-- Contact Seller button at the bottom -->
//                                             <div class="mt-auto">
//                                                 <button class="btn btn-success w-100" 
//                                                         data-seller="${book.userId}" 
//                                                         data-title="${book.title}" 
//                                                         onclick="openChatModal('${book.userId}', '${currentUser.uid}')">
//                                                     Contact Seller
//                                                 </button>
//                                             </div>
//                                         </div>
//                                     </div>
//                                 </div>
//                             `;
//                         }
//                     });
//                 } else {
//                     bookListContainer.innerHTML = '<p>No books available.</p>';
//                 }
//             });
//         } else {
//             bookListContainer.innerHTML = '<p>No books available.</p>';
//         }
//     });
// }

// // Event Listeners
// searchForm.addEventListener('submit', (event) => {
//     event.preventDefault();
//     displayBooks(getGenre(), searchInput.value.trim(), getSortOrder());
// });

// genreDropdownItems.forEach(item => {
//     item.addEventListener('click', (event) => {
//         const selectedGenre = event.target.getAttribute('data-genre');
//         displayBooks(selectedGenre, null, getSortOrder());
//         const newUrl = new URL(window.location.href);
//         newUrl.searchParams.set('genre', selectedGenre);
//         window.history.pushState({}, '', newUrl);
//     });
// });

// sortLowestPrice.addEventListener('click', () => displayBooks(getGenre(), null, 'priceLowToHigh'));
// sortHighestPrice.addEventListener('click', () => displayBooks(getGenre(), null, 'priceHighToLow'));
// sortMostRecent.addEventListener('click', () => displayBooks(getGenre(), null, 'dateListed'));

// // Make openChatModal accessible to genre.html
// window.openChatModal = openChatModal; // Add function to global scope

// // Open More Info modal
// window.openMoreInfoModal = function(bookId) {
//     const booksRef = ref(database, `book-listings/${bookId}`);
//     get(booksRef).then((snapshot) => {
//         if (snapshot.exists()) {
//             const book = snapshot.val();
//             document.getElementById('moreInfoBookTitle').textContent = book.title;
//             document.getElementById('moreInfoAuthor').textContent = book.author;
//             document.getElementById('moreInfoGenre').textContent = book.genre || 'N/A';
//             document.getElementById('moreInfoCondition').textContent = book.condition;
//             document.getElementById('moreInfoDescription').textContent = book.description || 'No description available';
//             document.getElementById('moreInfoPrice').textContent = book.price;
//             document.getElementById('moreInfoBookImage').src = book.imageUrl || 'images/default-book.png';

//             const modal = new bootstrap.Modal(document.getElementById('moreInfoModal'));
//             modal.show();
//         } else {
//             console.error('Book not found');
//         }
//     }).catch((error) => {
//         console.error('Error fetching book details:', error);
//     });
// };