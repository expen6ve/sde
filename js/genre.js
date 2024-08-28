import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getDatabase, ref, onValue, query, orderByChild } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";
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

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkAuth();

    const bookListContainer = document.querySelector('.row.gx-4.gx-lg-5');
    const genreDropdownItems = document.querySelectorAll('#genreDropdown + .dropdown-menu .dropdown-item');
    const sortLowestPrice = document.getElementById('sortLowestPrice');
    const sortHighestPrice = document.getElementById('sortHighestPrice');
    const sortMostRecent = document.getElementById('sortMostRecent');
    const genreHeading = document.getElementById('genreHeading');
    const logoLink = document.querySelector('.navbar-brand');
    const profileDropdown = document.querySelector('#profileDropdown');
    const messagesDropdown = document.querySelector('#messagesDropdown');
    const sellBook = document.querySelector('#sellBook')
    const booksFeedLink = document.getElementById('booksFeed');
    const signInButton = document.getElementById('signinbutton');
    const searchInput = document.querySelector('form[role="search"] input');

    // Redirect to login page
    const myButton = document.getElementById('signinbutton');
    if (myButton) {
        myButton.addEventListener('click', function() {
            window.location.href = 'login.html';
        });
    }

    if (user) {
        if (signInButton) signInButton.style.display = 'none';
    } else {
        if (signInButton) signInButton.style.display = 'block';
    }

    booksFeedLink.addEventListener('click', (event) => {
        event.preventDefault();
        if (user) {
            window.location.href = 'userhome.html';
        } else {
            window.location.href = 'index.html';
        }
    });

    if (!user) {
        logoLink.href = 'index.html';
        if (profileDropdown) profileDropdown.style.display = 'none';
        if (messagesDropdown) messagesDropdown.style.display = 'none';
        if (sellBook) sellBook.style.display = 'none';
    } else {
        logoLink.href = 'userhome.html';
        if (profileDropdown) profileDropdown.style.display = 'block';
        if (messagesDropdown) messagesDropdown.style.display = 'block';
        if (sellBook) sellBook.style.display = 'block';
    }

    const booksRef = ref(database, 'book-listings');
    const usersRef = ref(database, 'users');

    function displayBooks(genre = null, searchTerm = null, sortBy = 'dateListed') {
        let queryRef = booksRef;
    
        switch (sortBy) {
            case 'priceLowToHigh':
                queryRef = query(booksRef, orderByChild('price'));
                break;
            case 'priceHighToLow':
                queryRef = query(booksRef, orderByChild('price'));
                break;
            case 'dateListed':
                queryRef = query(booksRef, orderByChild('dateListed'));
                break;
            default:
                queryRef = booksRef;
                break;
        }
    
        onValue(queryRef, (snapshot) => {
            const bookData = snapshot.val();
            bookListContainer.innerHTML = '';
    
            if (bookData) {
                const userNames = {};
    
                onValue(usersRef, (userSnapshot) => {
                    const userData = userSnapshot.val();
    
                    if (userData) {
                        Object.keys(userData).forEach(userId => {
                            userNames[userId] = userData[userId].firstName || 'Unknown';
                        });
    
                        // Update the genre heading based on the current genre or search term
                        if (searchTerm && searchTerm.length > 0) {
                            genreHeading.textContent = `Search Results for "${searchTerm}"`;
                        } else if (genre) {
                            genreHeading.textContent = `Books in "${genre}"`;
                        } else {
                            genreHeading.textContent = "All Books";
                        }
    
                        const sortedBooks = Object.keys(bookData).map(key => ({
                            id: key,
                            ...bookData[key]
                        }));
    
                        if (sortBy === 'priceHighToLow') {
                            sortedBooks.sort((a, b) => b.price - a.price);
                        } else if (sortBy === 'priceLowToHigh') {
                            sortedBooks.sort((a, b) => a.price - b.price);
                        } else if (sortBy === 'dateListed') {
                            sortedBooks.sort((a, b) => new Date(b.dateListed) - new Date(a.dateListed));
                        }
    
                        sortedBooks.forEach(book => {
                            if ((!genre || book.genre === genre) && 
                                (!searchTerm || book.title.toLowerCase().includes(searchTerm.toLowerCase()))) {
                                const bookElement = document.createElement('div');
                                bookElement.className = 'col-lg-3 col-md-6 mb-5';
                                bookElement.innerHTML = `
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
                                `;
                                bookListContainer.appendChild(bookElement);
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
    
    // Search input event listener
    searchInput.addEventListener('input', (event) => {
        const searchTerm = event.target.value.trim();
        displayBooks(getGenre(), searchTerm, getSortOrder());
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

    sortLowestPrice.addEventListener('click', () => {
        displayBooks(getGenre(), null, 'priceLowToHigh');
    });

    sortHighestPrice.addEventListener('click', () => {
        displayBooks(getGenre(), null, 'priceHighToLow');
    });

    sortMostRecent.addEventListener('click', () => {
        displayBooks(getGenre(), null, 'dateListed');
    });

    const urlParams = new URLSearchParams(window.location.search);
    const genre = urlParams.get('genre');
    if (genre) {
        displayBooks(genre, null, getSortOrder());
    } else {
        displayBooks(null, null, getSortOrder());
    }

    searchInput.addEventListener('input', (event) => {
        const searchTerm = event.target.value.trim();
        if (searchTerm.length > 0) {
            displayBooks(getGenre(), searchTerm, getSortOrder());
        } else {
            displayBooks(getGenre(), null, getSortOrder());
        }
    });

    function getGenre() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('genre');
    }

    function getSortOrder() {
        return 'dateListed';
    }
});
