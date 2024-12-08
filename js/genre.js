import { checkAuth } from './auth.js';
import { getDatabase, ref, onValue, query, orderByChild, get } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";
import { initializeNavbar, handleSignOut } from './navbar.js';
import { openChatModal, sendMessage } from './contactseller.js';  // Import contact seller functions

const database = getDatabase();

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

document.addEventListener('DOMContentLoaded', async () => {
    // Wait for user authentication
    const user = await checkAuth();
    currentUser = user; // Make sure currentUser is set
    updateUIBasedOnAuth(user);

    // Only call displayBooks after currentUser is set
    const genre = getGenre();
    displayBooks(genre, null, getSortOrder());

    // Other event listeners
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

    searchInput.addEventListener('input', (event) => {
        displayBooks(getGenre(), event.target.value.trim(), getSortOrder());
    });

    if (signOutButton) {
        signOutButton.addEventListener('click', handleSignOut);
    }

    if (signInButton) {
        signInButton.addEventListener('click', () => {
            window.location.href = 'login.html';
        });
    }
});

// Initialize Navbar
document.addEventListener('DOMContentLoaded', initializeNavbar);

// Variables for message modal
let currentUser = null;

// Make the function globally accessible
window.openChatModal = openChatModal;  // Add the function to the global window object

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

                    // Display the books in cards
                    sortedBooks.forEach(book => {
                        // Only display books with 'approved' status
                        if (book.bookStatus === 'approved' &&
                            (!genre || book.genre === genre) &&
                            (!searchTerm || book.title.toLowerCase().includes(searchTerm.toLowerCase()))) {
                            bookListContainer.innerHTML += `
                                <div class="col-lg-3 col-md-6 mb-5">
                                    <div class="card h-100">
                                        <div class="card-body">
                                            <div class="d-flex justify-content-center">
                                                <img src="${book.imageUrl || 'images/default-book.png'}" class="img-fluid" alt="Book Image" style="height: 200px; object-fit: cover;">
                                            </div>
                                            <!-- Conditionally render Add to Favorites button -->
                                            ${
                                                book.userId !== currentUser.uid
                                                    ? `<div class="d-flex justify-content-center mt-3">
                                                        <button class="btn custom-btn" onclick="addToFave('${book.id}')">Add to Favorites</button>
                                                    </div>`
                                                    : ''
                                            }
                                            <h4 class="card-title mt-3 fs-5">${book.title}</h4>
                                            <p class="card-text"><strong>Author:</strong> ${book.author}</p>
                                            <p class="card-text"><strong>Seller:</strong> ${userNames[book.userId] || 'Unknown'}</p>
                                            <p class="card-text"><strong>Condition:</strong> ${book.condition}</p>
                                            <p class="card-text"><strong>Price:</strong> ₱${book.price}</p>
                                            <!-- More Info button to open modal -->
                                            <div class="mt-2 mb-2">
                                                <button class="btn btn-primary w-100" onclick="openMoreInfoModal('${book.id}')">More Info</button>
                                            </div>
                                            
                                            <!-- Conditionally render the Contact Seller button -->
                                            ${currentUser && currentUser.uid !== book.userId ? ` 
                                                <div class="mt-auto">
                                                    <button class="btn btn-success w-100" 
                                                            data-seller="${book.userId}" 
                                                            data-title="${book.title}" 
                                                            onclick="openChatModal('${book.userId}', '${currentUser.uid}')">
                                                        Contact Seller
                                                    </button>
                                                </div>
                                            ` : ''}
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


// Open More Info modal
window.openMoreInfoModal = function(bookId) {
    const booksRef = ref(database, `book-listings/${bookId}`);
    get(booksRef).then((snapshot) => {
        if (snapshot.exists()) {
            const book = snapshot.val();
            document.getElementById('moreInfoBookTitle').textContent = book.title;
            document.getElementById('moreInfoAuthor').textContent = book.author;
            document.getElementById('moreInfoGenre').textContent = book.genre || 'N/A';
            document.getElementById('moreInfoCondition').textContent = book.condition;
            document.getElementById('moreInfoDescription').textContent = book.description || 'No description available';
            document.getElementById('moreInfoPrice').textContent = book.price;
            document.getElementById('moreInfoBookImage').src = book.imageUrl || 'images/default-book.png';

            const modal = new bootstrap.Modal(document.getElementById('moreInfoModal'));
            modal.show();
        } else {
            console.error('Book not found');
        }
    }).catch((error) => {
        console.error('Error fetching book details:', error);
    });
};

// Send message
document.getElementById('sendMessageBtn').addEventListener('click', () => {
    const messageInput = document.getElementById('messageInput');
    sendMessage(messageInput);  // Using function from contactseller.js
});

function addToFave(bookId) {
    const favoriteBooksRef = ref(database, `favorite-books/${currentUser.uid}/${bookId}`);

    // Check if the book already exists in favorites
    get(favoriteBooksRef).then((snapshot) => {
        if (snapshot.exists()) {
            // Book already exists in favorites
            alert('This book is already in your favorites!');
        } else {
            // If not, fetch the book details from the listings
            const bookRef = ref(database, `book-listings/${bookId}`);
            get(bookRef).then((bookSnapshot) => {
                if (bookSnapshot.exists()) {
                    const bookDetails = bookSnapshot.val();

                    // Add the book to favorites
                    set(favoriteBooksRef, {
                        ...bookDetails,
                    })
                    .then(() => {
                        alert('Book added to favorites!');
                    })
                    .catch((error) => {
                        console.error('Error adding to favorites:', error);
                        alert('Failed to add book to favorites.');
                    });
                } else {
                    console.error('Book not found in listings');
                    alert('Failed to find book details.');
                }
            }).catch((error) => {
                console.error('Error fetching book details:', error);
                alert('Failed to fetch book details.');
            });
        }
    }).catch((error) => {
        console.error('Error checking favorites:', error);
        alert('Failed to check if the book is already in favorites.');
    });
}

// Attach the function to the global window object
window.addToFave = addToFave;