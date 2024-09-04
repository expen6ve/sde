import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getDatabase, ref, onValue, query, orderByChild } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { initializeNavbar } from './navbar.js';
import { checkAuth } from './auth.js';

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
const database = getDatabase(app);
const auth = getAuth(app);

// DOM elements
const bookListContainer = document.getElementById('bookListContainer');
const genreDropdownItems = document.querySelectorAll('#genreDropdown + .dropdown-menu .dropdown-item');
const sortLowestPrice = document.getElementById('sortLowestPrice');
const sortHighestPrice = document.getElementById('sortHighestPrice');
const sortMostRecent = document.getElementById('sortMostRecent');
const genreHeading = document.getElementById('genreHeading');
const logoLink = document.querySelector('.navbar-brand');
const profileDropdown = document.querySelector('#profileDropdown');
const messagesDropdown = document.querySelector('#messagesDropdown');
const sellBook = document.querySelector('#sellBook');
const booksFeedLink = document.getElementById('booksFeed');
const signInButton = document.getElementById('signinbutton');
const signOutButton = document.getElementById('signOut');
const searchForm = document.querySelector('form[role="search"]');
const searchInput = searchForm.querySelector('input');

// Initialize Navbar
document.addEventListener('DOMContentLoaded', initializeNavbar);

// Helper Functions
function getGenre() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('genre');
}

function getSortOrder() {
    return 'dateListed';
}

function updateUIBasedOnAuth(user) {
    if (signInButton) signInButton.style.display = user ? 'none' : 'block';
    if (logoLink) logoLink.href = user ? 'userhome.html' : 'index.html';
    if (profileDropdown) profileDropdown.style.display = user ? 'block' : 'none';
    if (messagesDropdown) messagesDropdown.style.display = user ? 'block' : 'none';
    if (sellBook) sellBook.style.display = user ? 'block' : 'none';
}

function displayBooks(genre = null, searchTerm = null, sortBy = 'dateListed') {
    const booksRef = ref(database, 'book-listings');
    let queryRef = booksRef;

    switch (sortBy) {
        case 'priceLowToHigh':
        case 'priceHighToLow':
            queryRef = query(booksRef, orderByChild('price'));
            break;
        case 'dateListed':
            queryRef = query(booksRef, orderByChild('dateListed'));
            break;
    }

    onValue(queryRef, (snapshot) => {
        const bookData = snapshot.val();
        bookListContainer.innerHTML = '';
        if (bookData) {
            const userNames = {};
            onValue(ref(database, 'users'), (userSnapshot) => {
                const userData = userSnapshot.val();
                if (userData) {
                    Object.keys(userData).forEach(userId => {
                        userNames[userId] = userData[userId].firstName || 'Unknown';
                    });
                    
                    genreHeading.textContent = searchTerm
                        ? `Search Results for "${searchTerm}"`
                        : genre
                            ? `Books in "${genre}"`
                            : "All Books";
                    
                    const sortedBooks = Object.keys(bookData).map(key => ({
                        id: key,
                        ...bookData[key]
                    }));

                    sortedBooks.sort((a, b) => {
                        if (sortBy === 'priceHighToLow') return b.price - a.price;
                        if (sortBy === 'priceLowToHigh') return a.price - b.price;
                        return new Date(b.dateListed) - new Date(a.dateListed);
                    });

                    sortedBooks.forEach(book => {
                        if ((!genre || book.genre === genre) &&
                            (!searchTerm || book.title.toLowerCase().includes(searchTerm.toLowerCase()))) {
                            bookListContainer.innerHTML += `
                                <div class="col-lg-3 col-md-6 mb-5">
                                    <div class="card h-100">
                                        <div class="card-body">
                                            <div class="d-flex justify-content-center">
                                                <img src="${book.imageUrl || 'images/default-book.png'}" class="img-fluid" alt="Book Image" style="height: 200px; object-fit: cover;">
                                            </div>
                                            <div class="d-flex justify-content-center mt-3">
                                                <button class="btn custom-btn">Add to Favorites</button>
                                            </div>
                                            <h4 class="card-title mt-3 fs-5">${book.title}</h4>
                                            <p class="card-text"><strong>Author:</strong> ${book.author}</p>
                                            <p class="card-text"><strong>Seller:</strong> ${userNames[book.userId] || 'Unknown'}</p>
                                            <p class="card-text"><strong>Condition:</strong> ${book.condition}</p>
                                            <p class="card-text"><strong>Price:</strong> ₱${book.price}</p>
                                            <div class="d-flex justify-content-between mt-3">
                                                <button class="btn btn-success">Contact Seller</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            `;
                        }
                    });
                } else {
                    bookListContainer.innerHTML = '<p>No books available.</p>';
                }
            });
        } else {
            bookListContainer.innerHTML = '<p>No books available.</p>';
        }
    });
}

// Event Listeners
document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkAuth();
    updateUIBasedOnAuth(user);

    searchForm.addEventListener('submit', (event) => {
        event.preventDefault();
        displayBooks(getGenre(), searchInput.value.trim(), getSortOrder());
    });

    booksFeedLink.addEventListener('click', (event) => {
        event.preventDefault();
        window.location.href = user ? 'userhome.html' : 'index.html';
    });

    genreDropdownItems.forEach(item => {
        item.addEventListener('click', (event) => {
            const selectedGenre = event.target.getAttribute('data-genre');
            displayBooks(selectedGenre, null, getSortOrder());
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.set('genre', selectedGenre);
            window.history.pushState({}, '', newUrl);
        });
    });

    sortLowestPrice.addEventListener('click', () => displayBooks(getGenre(), null, 'priceLowToHigh'));
    sortHighestPrice.addEventListener('click', () => displayBooks(getGenre(), null, 'priceHighToLow'));
    sortMostRecent.addEventListener('click', () => displayBooks(getGenre(), null, 'dateListed'));

    const genre = getGenre();
    displayBooks(genre, null, getSortOrder());

    searchInput.addEventListener('input', (event) => {
        displayBooks(getGenre(), event.target.value.trim(), getSortOrder());
    });

    if (signOutButton) {
        signOutButton.addEventListener('click', handleSignOut);
    }

    if (signInButton) {
        signInButton.addEventListener('click', () => {
            window.location.href = 'login.html'; // Redirect to login page on sign-in button click
        });
    }
});

