import { checkAuth } from './auth.js';
import { getDatabase, ref, onValue, set } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";
import { initializeNavbar } from './navbar.js';
import { openChatModal, sendMessage } from './contactseller.js';  // Import contact seller functions

const database = getDatabase();
const elements = {
    bookListContainer: document.getElementById('bookListContainer'),
    signInButton: document.getElementById('signinbutton'),
    signOutButton: document.getElementById('signOut'),
    searchInput: document.querySelector('form[role="search"] input'),
    sortButtons: {
        low: document.getElementById('sortLowestPrice'),
        high: document.getElementById('sortHighestPrice'),
        recent: document.getElementById('sortMostRecent'),
    },
    genreHeading: document.getElementById('genreHeading'),
};

let currentUser = null;
let selectedGenre = null;

// Call this function in your DOMContentLoaded event to load favorite books
document.addEventListener('DOMContentLoaded', async () => {
    initializeNavbar();
    currentUser = await checkAuth();
    if (currentUser) {
        elements.signInButton.style.display = 'none';
        displayFavoriteBooks(currentUser.uid); // Display favorite books
    } else {
        elements.signInButton.style.display = 'block';
    }
});

// Display favorite books for the logged-in user
function displayFavoriteBooks(userId, searchTerm = '', sortBy = 'dateListed', genre = null) {
    const favoriteBooksRef = ref(database, `favorite-books/${userId}`);

    onValue(favoriteBooksRef, (snapshot) => {
        const favoriteBooks = snapshot.val() || {};
        const bookEntries = Object.entries(favoriteBooks);

        elements.bookListContainer.innerHTML = bookEntries.length 
            ? renderBooks(bookEntries, searchTerm, sortBy, genre) 
            : '<p>No favorite books available.</p>';
    });
}

// Render books based on filters
function renderBooks(bookEntries, searchTerm, sortBy, genre) {
    const sortedBooks = bookEntries
        .map(([id, book]) => ({ id, ...book }))
        .filter(book => 
            (!genre || book.genre === genre) &&
            (!searchTerm || book.title.toLowerCase().includes(searchTerm.toLowerCase()))
        )
        .sort((a, b) => sortBooks(a, b, sortBy));

    elements.genreHeading.textContent = searchTerm 
        ? `Search Results for "${searchTerm}"`
        : genre 
        ? `Books in "${genre}"`
        : "My Favorite Books";

    return sortedBooks.map(book => {
        // Determine the badge to display based on bookStatus
        let statusBadge = '';
        if (book.bookStatus === 'rejected') {
            statusBadge = `<span class="badge bg-danger">Rejected</span>`;
        } else if (book.bookStatus === 'pending') {
            statusBadge = `<span class="badge bg-warning">Pending</span>`;
        }

        return `
        <div class="col-lg-3 col-md-6 mb-5">
            <div class="card h-100 d-flex flex-column">
                <div class="card-body d-flex flex-column flex-grow-1">
                    <div class="d-flex justify-content-center">
                        <img src="${book.imageUrl || 'images/default-book.png'}" class="img-fluid" alt="Book Image" style="height: 200px; object-fit: cover;">
                    </div>
                    <h4 class="card-title mt-3 fs-5">${book.title} ${statusBadge}</h4>
                    <p class="card-text"><strong>Author:</strong> ${book.author}</p>
                    <p class="card-text"><strong>Condition:</strong> ${book.condition}</p>
                    <p class="card-text"><strong>Price:</strong> ₱${book.price}</p>
                    ${
                        book.userId !== currentUser.uid
                            ? `<div class="mt-auto">
                                <button class="btn btn-success w-100" 
                                        data-seller="${book.userId}" 
                                        data-title="${book.title}" 
                                        data-image="${book.imageUrl || 'images/default-book.png'}" 
                                        onclick="openChatModal('${book.userId}', '${currentUser.uid}', '${book.title}', '${book.imageUrl || 'images/default-book.png'}')">
                                    Contact Seller
                                </button>
                                <button class="btn btn-danger w-100 mt-2" 
                                        data-book-id="${book.id}" 
                                        onclick="removeFromFavorites('${book.id}')">
                                    Remove from Favorites
                                </button>
                                </div>`
                            : ''
                    }                        
                </div>
            </div>
        </div>`;

    }).join('');
}
// Make the function globally accessible
window.openChatModal = openChatModal;  // Add the function to the global window object

// Send message
document.getElementById('sendMessageBtn').addEventListener('click', () => {
    const messageInput = document.getElementById('messageInput');
    sendMessage(messageInput);  // Using function from contactseller.js
});

// Sort books based on the selected criteria
function sortBooks(a, b, sortBy) {
    return sortBy === 'priceHighToLow' ? b.price - a.price :
           sortBy === 'priceLowToHigh' ? a.price - b.price :
           new Date(b.dateListed) - new Date(a.dateListed);
}

// Search functionality
elements.searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.trim();
    if (currentUser) displayFavoriteBooks(currentUser.uid, searchTerm, getSortOrder(), selectedGenre);
});

// Sort buttons functionality
Object.entries(elements.sortButtons).forEach(([key, button]) => {
    button.addEventListener('click', () => {
        const sortBy = key === 'low' ? 'priceLowToHigh' : key === 'high' ? 'priceHighToLow' : 'dateListed';
        if (currentUser) displayFavoriteBooks(currentUser.uid, elements.searchInput.value.trim(), sortBy, selectedGenre);
    });
});

// Remove book from favorites
window.removeFromFavorites = function(bookId) {
    const userId = currentUser.uid; // Get the current user's ID
    const bookRef = ref(database, `favorite-books/${userId}/${bookId}`); // Reference to the specific book

    // Remove the book from the favorite-books node
    set(bookRef, null)
        .then(() => {
            alert('Book removed from favorites.');
            displayFavoriteBooks(userId); // Refresh the displayed list
        })
        .catch((error) => {
            console.error("Error removing book from favorites: ", error);
        });
};
