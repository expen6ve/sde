import { checkAuth } from './auth.js';
import { getDatabase, ref, onValue, query, orderByChild, equalTo, set, remove, get } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";
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
    genreHeading: document.getElementById('genreHeading'),
    profilePreview: document.getElementById('profilePreview'),
    bookImageInput: document.getElementById('bookImage'),
    saveEditButton: document.getElementById('saveEditButton'),
    editModalCloseButton: document.querySelector('#editListingModal .btn-close'),
    confirmRemoveButton: document.getElementById('confirmRemoveButton'),
    removeModalCloseButton: document.querySelector('#removeListingModal .btn-close') // Added close button reference
};

let currentBookIdToEdit = null;
let currentBookIdToRemove = null;
let bookData = {};
let currentUser = null;
let selectedGenre = null;

// Initialize Navbar and Authentication
document.addEventListener('DOMContentLoaded', async () => {
    initializeNavbar();
    currentUser = await checkAuth();
    if (currentUser) {
        elements.signInButton.style.display = 'none';
        displayUserBooks(currentUser.uid);
    } else {
        elements.signInButton.style.display = 'block';
    }
});

// Display books for the logged-in user
function displayUserBooks(userId, searchTerm = '', sortBy = 'dateListed', genre = null) {
    const queryRef = query(ref(database, 'book-listings'), orderByChild('userId'), equalTo(userId));

    onValue(queryRef, (snapshot) => {
        bookData = snapshot.val() || {};
        elements.bookListContainer.innerHTML = Object.keys(bookData).length 
            ? renderBooks(Object.entries(bookData), searchTerm, sortBy, genre) 
            : '<p>No books available.</p>';
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
        : "My Book Listings";

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
                <div class="d-flex justify-content-between mt-3">
                    <button class="btn btn-danger m-1 remove-listing" data-id="${book.id}" data-bs-toggle="modal" data-bs-target="#removeListingModal">Remove Listing</button>
                    <button class="btn btn-secondary m-1 edit-listing" data-id="${book.id}" data-bs-toggle="modal" data-bs-target="#editListingModal">Edit Listing</button>
                </div>
            </div>
        </div>`
    ).join('');
}

// Sort books based on the selected criteria
function sortBooks(a, b, sortBy) {
    return sortBy === 'priceHighToLow' ? b.price - a.price :
           sortBy === 'priceLowToHigh' ? a.price - b.price :
           new Date(b.dateListed) - new Date(a.dateListed);
}

// Search functionality
elements.searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.trim();
    if (currentUser) displayUserBooks(currentUser.uid, searchTerm, getSortOrder(), selectedGenre);
});

// Genre filter functionality
elements.genreDropdownItems.forEach(item => {
    item.addEventListener('click', (event) => {
        selectedGenre = event.target.getAttribute('data-genre');
        displayUserBooks(currentUser.uid, elements.searchInput.value.trim(), getSortOrder(), selectedGenre);
    });
});

// Sort buttons functionality
Object.entries(elements.sortButtons).forEach(([key, button]) => {
    button.addEventListener('click', () => {
        const sortBy = key === 'low' ? 'priceLowToHigh' : key === 'high' ? 'priceHighToLow' : 'dateListed';
        if (currentUser) displayUserBooks(currentUser.uid, elements.searchInput.value.trim(), sortBy, selectedGenre);
    });
});

// Remove book functionality
document.addEventListener('click', (event) => {
    if (event.target.classList.contains('remove-listing')) {
        currentBookIdToRemove = event.target.dataset.id;
    }
});

// Confirm removal of the book listing
elements.confirmRemoveButton.addEventListener('click', async () => {
    if (currentBookIdToRemove) {
        await remove(ref(database, `book-listings/${currentBookIdToRemove}`));
        displayUserBooks(currentUser.uid);
        currentBookIdToRemove = null;
        
        // Close the remove listing modal
        elements.removeModalCloseButton.click();
    }
});

// Editing book functionality
document.addEventListener('click', (event) => {
    if (event.target.classList.contains('edit-listing')) {
        currentBookIdToEdit = event.target.dataset.id;
        const book = bookData[currentBookIdToEdit];

        // Populate modal fields
        document.getElementById('editBookTitle').value = book.title;
        document.getElementById('editAuthor').value = book.author;
        document.getElementById('editGenre').value = book.genre;
        document.getElementById('editCondition').value = book.condition;
        document.getElementById('editDescription').value = book.description;
        document.getElementById('editPrice').value = book.price;

        // Show existing book image in preview
        elements.profilePreview.src = book.imageUrl || 'images/default-avatar.png';
    }
});

// Image upload preview functionality
elements.bookImageInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();

        // When the file is read, update the preview
        reader.onload = (e) => {
            elements.profilePreview.src = e.target.result;  // Set the image preview to the uploaded image
        };

        // Read the file as a data URL (base64)
        reader.readAsDataURL(file);
    }
});

// Save changes to book
elements.saveEditButton.addEventListener('click', async () => {
    if (currentBookIdToEdit) {
        const bookRef = ref(database, `book-listings/${currentBookIdToEdit}`);
        const existingBookData = (await get(bookRef)).val();

        const updatedBook = {
            ...existingBookData,
            title: document.getElementById('editBookTitle').value,
            author: document.getElementById('editAuthor').value,
            genre: document.getElementById('editGenre').value,
            condition: document.getElementById('editCondition').value,
            description: document.getElementById('editDescription').value,
            price: document.getElementById('editPrice').value
        };

        await set(bookRef, updatedBook);
        closeModal();
        displayUserBooks(currentUser.uid);
    }
});

// Close the edit listing modal
function closeModal() {
    elements.editModalCloseButton.click();
}
