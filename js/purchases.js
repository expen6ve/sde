import { checkAuth } from './auth.js';
import { getDatabase, ref, onValue, query, equalTo, orderByChild } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";
import { initializeNavbar } from './navbar.js';

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
    genreDropdownItems: document.querySelectorAll('#genreDropdown + .dropdown-menu .dropdown-item'),
    genreHeading: document.getElementById('genreHeading')
};



let bookData = {};
let currentUser = null;
let selectedGenre = null;

// Initialize Navbar and Authentication
document.addEventListener('DOMContentLoaded', async () => {
    initializeNavbar();
    currentUser = await checkAuth();

    if (currentUser) {
        elements.signInButton.style.display = 'none';
        displayPurchasedBooks(currentUser.uid);
    } else {
        elements.signInButton.style.display = 'block';
    }

    // Add an event listener to clean up the modal after it is closed
    const viewDetailsModalEl = document.getElementById('viewDetailsModal');
    viewDetailsModalEl.addEventListener('hidden.bs.modal', () => {
        resetViewDetailsModal();
    });
});

// Display purchased books for the logged-in user
function displayPurchasedBooks(userId, searchTerm = '', sortBy = 'dateSold', genre = null) {
    const queryRef = query(ref(database, 'sold-books'), orderByChild('buyerId'), equalTo(userId));

    onValue(queryRef, (snapshot) => {
        bookData = snapshot.val() || {};
        elements.bookListContainer.innerHTML = Object.keys(bookData).length 
            ? renderPurchasedBooks(Object.entries(bookData), searchTerm, sortBy, genre) 
            : '<p>No purchased books found.</p>';
    });
}

// Render purchased books based on filters
function renderPurchasedBooks(bookEntries, searchTerm, sortBy, genre) {
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
        : "My Purchased Books";

    return sortedBooks.map(book => 
        `<div class="col-lg-3 col-md-6 mb-5">
            <div class="card h-100 d-flex flex-column">
                <div class="card-body d-flex flex-column flex-grow-1">
                    <div class="d-flex justify-content-center">
                        <img src="${book.imageUrl || 'images/default-book.png'}" class="img-fluid" alt="Book Image" style="height: 200px; object-fit: cover;">
                    </div>
                    <h4 class="card-title mt-3 fs-5">${book.title}</h4>
                    <p class="card-text"><strong>Author:</strong> ${book.author}</p>
                    <p class="card-text"><strong>Condition:</strong> ${book.condition}</p>
                    <p class="card-text"><strong>Price:</strong> ₱${book.price}</p>
                </div>
                <div class="d-flex justify-content-center mt-3">
                    <button class="btn btn-info m-1 view-details-btn" data-id="${book.id}" data-bs-toggle="modal" data-bs-target="#viewDetailsModal">View Details</button>
                </div>
            </div>
        </div>
`
    ).join('');
}



// Sort books based on the selected criteria
function sortBooks(a, b, sortBy) {
    return sortBy === 'priceHighToLow' ? b.price - a.price :
           sortBy === 'priceLowToHigh' ? a.price - b.price :
           new Date(b.dateSold) - new Date(a.dateSold);
}

// Search functionality
elements.searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.trim();
    if (currentUser) displayPurchasedBooks(currentUser.uid, searchTerm, getSortOrder(), selectedGenre);
});

// Sort buttons functionality
Object.entries(elements.sortButtons).forEach(([key, button]) => {
    button.addEventListener('click', () => {
        const sortBy = key === 'low' ? 'priceLowToHigh' : key === 'high' ? 'priceHighToLow' : 'dateSold';
        if (currentUser) displayPurchasedBooks(currentUser.uid, elements.searchInput.value.trim(), sortBy, selectedGenre);
    });
});

// Helper function to get the current sort order (based on button clicked)
function getSortOrder() {
    // You can implement logic here based on the current button clicked
    return 'dateSold'; // For example, return 'dateSold' by default
}

// Add an event listener to handle clicks on the "View Details" button
document.addEventListener('click', async (event) => {
    const button = event.target;
    if (button.matches('.btn-info[data-id]')) {
        const bookId = button.getAttribute('data-id');
        const book = bookData[bookId];

        if (book) {
            const sellerDetails = await fetchSellerDetails(book.sellerId);
            populateViewDetailsModal(book, sellerDetails, bookId);
        }
    }
});

// Fetch seller details from the database
async function fetchSellerDetails(sellerId) {
    const userRef = ref(database, `users/${sellerId}`);
    return new Promise((resolve) => {
        onValue(userRef, (snapshot) => {
            resolve(snapshot.val() || {});
        }, { onlyOnce: true });
    });
}

// Reset modal fields after closing
function resetViewDetailsModal() {
    document.getElementById('moreInfoBookImage').src = '';
    document.getElementById('moreInfoBookTitle').textContent = '';
    document.getElementById('moreInfoAuthor').textContent = '';
    document.getElementById('moreInfoGenre').textContent = '';
    document.getElementById('moreInfoCondition').textContent = '';
    document.getElementById('moreInfoPrice').textContent = '';
    document.getElementById('dateSold').textContent = '';
    document.getElementById('sellerName').textContent = '';
    document.getElementById('soldBooksId').textContent = '';
}

// Populate the modal with book and seller details
function populateViewDetailsModal(book, seller, bookId) {
    const modalEl = document.getElementById('viewDetailsModal');

    // Set book details
    document.getElementById('moreInfoBookImage').src = book.imageUrl || 'images/default-book.png';
    document.getElementById('moreInfoBookTitle').textContent = book.title || 'N/A';
    document.getElementById('moreInfoAuthor').textContent = book.author || 'N/A';
    document.getElementById('moreInfoGenre').textContent = book.genre || 'N/A';
    document.getElementById('moreInfoCondition').textContent = book.condition || 'N/A';
    document.getElementById('moreInfoPrice').textContent = book.price || 'N/A';

    // Set seller and purchase details
    document.getElementById('dateSold').textContent = new Date(book.dateSold).toLocaleString() || 'N/A';
    document.getElementById('sellerName').textContent = `${seller.firstName || 'N/A'} ${seller.lastName || ''}`;
    document.getElementById('soldBooksId').textContent = bookId || 'N/A';

    // Show the modal dynamically
    const viewDetailsModal = bootstrap.Modal.getOrCreateInstance(modalEl);
    viewDetailsModal.show();
}
