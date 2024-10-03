import { checkAuth } from './auth.js';
import { getDatabase, ref, onValue, query, orderByChild, equalTo, set, remove, get } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";
import { initializeNavbar, handleSignOut } from './navbar.js';

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
    profilePreview: document.getElementById('profilePreview'), // Added for book image preview
    bookImageInput: document.getElementById('bookImage') // Added for book image upload
};

let currentBookIdToEdit = null;
let bookData = {};

// Initialize Navbar
document.addEventListener('DOMContentLoaded', () => {
    initializeNavbar();
    handleAuth();
});

// Handle user authentication
async function handleAuth() {
    const user = await checkAuth();
    if (user) {
        elements.signInButton.style.display = 'none';
        displayUserBooks(user.uid);
    } else {
        elements.signInButton.style.display = 'block';
    }
}

// Display books for the logged-in user
function displayUserBooks(userId, searchTerm = '', sortBy = 'dateListed') {
    const queryRef = query(ref(database, 'book-listings'), orderByChild('userId'), equalTo(userId));
    
    onValue(queryRef, (snapshot) => {
        bookData = snapshot.val() || {};
        elements.bookListContainer.innerHTML = Object.keys(bookData).length ? renderBooks(Object.entries(bookData), searchTerm, sortBy) : '<p>No books available.</p>';
    });
}

// Render books and handle "Edit Listing" button click
function renderBooks(bookEntries, searchTerm, sortBy) {
    const sortedBooks = bookEntries.map(([id, book]) => ({ id, ...book }))
        .filter(book => book.title.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => sortBooks(a, b, sortBy));

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
        </div>`).join('');
}

// Event listener for "Edit Listing" button
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

// Event listener for "Save Changes" button in Edit Modal
document.getElementById('saveEditButton').addEventListener('click', async () => {
    const updatedBook = {
        title: document.getElementById('editBookTitle').value,
        author: document.getElementById('editAuthor').value,
        genre: document.getElementById('editGenre').value,
        condition: document.getElementById('editCondition').value,
        description: document.getElementById('editDescription').value,
        price: document.getElementById('editPrice').value,
        dateListed: new Date().toISOString() // Optionally update the date
    };

    // Check for new image upload
    if (elements.bookImageInput.files.length > 0) {
        const file = elements.bookImageInput.files[0];
        const reader = new FileReader();
        reader.onload = async (e) => {
            updatedBook.imageUrl = e.target.result; // Get the new image URL

            if (currentBookIdToEdit) {
                // Fetch the existing book data to retain userId
                const bookRef = ref(database, `book-listings/${currentBookIdToEdit}`);
                const existingBookSnapshot = await get(bookRef);
                const existingBookData = existingBookSnapshot.val();

                // Merge the updated fields with the existing data
                await set(bookRef, { ...existingBookData, ...updatedBook });

                currentBookIdToEdit = null;

                // Close modal and refresh listings
                document.querySelector('#editListingModal .btn-close').click();
                const user = await checkAuth();
                if (user) displayUserBooks(user.uid);
            }
        };
        reader.readAsDataURL(file); // Read the file as a data URL
    } else {
        if (currentBookIdToEdit) {
            // Fetch the existing book data to retain userId
            const bookRef = ref(database, `book-listings/${currentBookIdToEdit}`);
            const existingBookSnapshot = await get(bookRef);
            const existingBookData = existingBookSnapshot.val();

            // Merge the updated fields with the existing data
            await set(bookRef, { ...existingBookData, ...updatedBook });

            currentBookIdToEdit = null;

            // Close modal and refresh listings
            document.querySelector('#editListingModal .btn-close').click();
            const user = await checkAuth();
            if (user) displayUserBooks(user.uid);
        }
    }
});

// Sort books based on the selected criteria
function sortBooks(a, b, sortBy) {
    return sortBy === 'priceHighToLow' ? b.price - a.price :
           sortBy === 'priceLowToHigh' ? a.price - b.price :
           new Date(b.dateListed) - new Date(a.dateListed);
}

// Function to remove a book listing from the database
async function removeListing(bookId) {
    await remove(ref(database, `book-listings/${bookId}`));
    const user = await checkAuth();
    if (user) displayUserBooks(user.uid);
}

// Add event listeners
elements.searchInput.addEventListener('input', (e) => {
    const userId = checkAuth()?.uid;
    if (userId) displayUserBooks(userId, e.target.value);
});

Object.entries(elements.sortButtons).forEach(([key, button]) => {
    button.addEventListener('click', async () => {
        const userId = await checkAuth()?.uid;
        if (userId) displayUserBooks(userId, elements.searchInput.value, key === 'low' ? 'priceLowToHigh' : key === 'high' ? 'priceHighToLow' : 'dateListed');
    });
});

// Event listener for "Remove Listing" button
let bookIdToRemove;

document.addEventListener('click', (event) => {
    if (event.target.classList.contains('remove-listing')) {
        bookIdToRemove = event.target.dataset.id;
    }
});

// Confirm removal when the "Remove" button in the modal is clicked
document.getElementById('confirmRemoveButton').addEventListener('click', () => {
    if (bookIdToRemove) {
        removeListing(bookIdToRemove);
        bookIdToRemove = null;
    }
});

// Handle book image upload preview
elements.bookImageInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            elements.profilePreview.src = e.target.result; // Preview uploaded image
        };
        reader.readAsDataURL(file);
    }
});
