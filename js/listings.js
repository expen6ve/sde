import { checkAuth } from './auth.js';
import { getDatabase, ref, onValue, query, orderByChild, equalTo, set, remove, get } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js";
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
    removeModalCloseButton: document.querySelector('#removeListingModal .btn-close'), // Added close button reference
    soldBookListContainer: document.getElementById('soldBookListContainer')
};

let currentBookIdToEdit = null;
let currentBookIdToRemove = null;
let bookData = {};
let currentUser = null;
let selectedGenre = null;


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

    return sortedBooks.map(book => {
        // Determine the badge to display based on bookStatus
        let statusBadge = '';
        if (book.bookStatus === 'rejected') {
            statusBadge = `<span class="badge bg-danger">Rejected</span>`;
        } else if (book.bookStatus === 'pending') {
            statusBadge = `<span class="badge bg-warning">Pending</span>`;
        }

        // Conditionally render the Edit Listing button
        const editButton = book.bookStatus !== 'rejected' 
            ? `<button class="btn btn-secondary m-1 edit-listing" data-id="${book.id}" data-bs-toggle="modal" data-bs-target="#editListingModal">Edit Listing</button>` 
            : '';

        // Determine alignment based on the presence of the editButton
        const buttonContainerClass = editButton 
            ? 'd-flex justify-content-between mt-3' 
            : 'd-flex justify-content-center mt-3';

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
                    </div>
                    <div class="${buttonContainerClass}">
                        <button class="btn btn-danger m-1 remove-listing" data-id="${book.id}" data-bs-toggle="modal" data-bs-target="#removeListingModal">Remove Listing</button>
                        ${editButton}
                    </div>
                </div>
            </div>`;
    }).join('');
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

// Save changes to the book
elements.saveEditButton.addEventListener('click', async () => {
    if (currentBookIdToEdit) {
        const bookRef = ref(database, `book-listings/${currentBookIdToEdit}`);
        const existingBookData = (await get(bookRef)).val();

        let updatedBook = {
            ...existingBookData,
            title: document.getElementById('editBookTitle').value,
            author: document.getElementById('editAuthor').value,
            genre: document.getElementById('editGenre').value,
            condition: document.getElementById('editCondition').value,
            description: document.getElementById('editDescription').value,
            price: document.getElementById('editPrice').value,
        };

        // Check if a new image is uploaded
        const file = elements.bookImageInput.files[0];
        if (file) {
            // Upload image to Firebase Storage
            const storage = getStorage();
            const imageRef = storageRef(storage, `book-images/${currentBookIdToEdit}`);
            
            try {
                const snapshot = await uploadBytes(imageRef, file);
                const imageUrl = await getDownloadURL(snapshot.ref);
                updatedBook.imageUrl = imageUrl; // Add image URL to the book data
            } catch (error) {
                console.error('Image upload failed:', error);
                // Proceed without updating the image if upload fails
            }
        }

        // Save the updated book data to Firebase Realtime Database
        await set(bookRef, updatedBook);
        closeModal();
        displayUserBooks(currentUser.uid);
    }
});

// Close the edit listing modal
function closeModal() {
    elements.editModalCloseButton.click();
}

// Display sold books for the logged-in user
function displaySoldBooks(userId) {
    const soldBooksQuery = query(ref(database, 'sold-books'), orderByChild('sellerId'), equalTo(userId));

    onValue(soldBooksQuery, (snapshot) => {
        const soldBooksData = snapshot.val() || {};
        elements.soldBookListContainer.innerHTML = Object.keys(soldBooksData).length 
            ? renderSoldBooks(Object.entries(soldBooksData)) 
            : '<p>No sold books.</p>';
    });
}

// Render the sold books
function renderSoldBooks(soldBookEntries) {
    return soldBookEntries.map(([id, book]) => {
        return `
            <div class="col-lg-3 col-md-6 mb-5">
                <div class="card h-100 d-flex flex-column">
                    <div class="card-body d-flex flex-column flex-grow-1">
                        <div class="d-flex justify-content-center">
                            <img src="${book.imageUrl || 'images/default-book.png'}" class="img-fluid" alt="Book Image" style="height: 200px; object-fit: cover;">
                        </div>
                        <h4 class="card-title mt-3 fs-5">${book.title} <span class="badge bg-secondary">Sold</span></h4>
                        <p class="card-text"><strong>Author:</strong> ${book.author}</p>
                        <p class="card-text"><strong>Condition:</strong> ${book.condition}</p>
                        <p class="card-text"><strong>Price:</strong> ₱${book.price}</p>
                    </div>
                    <div class="d-flex justify-content-center mt-3"> <!-- Change here -->
                        <button class="btn btn-info m-1 view-details-btn" data-id="${id}" data-bs-toggle="modal" data-bs-target="#viewDetailsModal">View Details</button>

                    </div>
                </div>
            </div>
`;
    }).join('');
}

// Call this function in your DOMContentLoaded event to load sold books
document.addEventListener('DOMContentLoaded', async () => {
    initializeNavbar();
    currentUser = await checkAuth();
    if (currentUser) {
        elements.signInButton.style.display = 'none';
        displayUserBooks(currentUser.uid); // Display listings
        displaySoldBooks(currentUser.uid); // Display sold books
    } else {
        elements.signInButton.style.display = 'block';
    }
});

// Event listener for "View Details" button
document.addEventListener('click', async (event) => {
    const button = event.target;
    if (button.matches('.btn-info[data-id]')) {
        console.log('View Details button clicked');
        const bookId = button.getAttribute('data-id');
        console.log(`Book ID: ${bookId}`);
        
        try {
            // Fetch sold book data from "sold-books" node
            const soldBookRef = ref(database, `sold-books/${bookId}`);
            const soldBookSnapshot = await get(soldBookRef);
            if (soldBookSnapshot.exists()) {
                const book = soldBookSnapshot.val();
                console.log('Sold book data found:', book);

                // Fetch buyer details
                const buyerDetails = await fetchBuyerDetails(book.buyerId);
                console.log('Buyer details fetched:', buyerDetails);

                // Populate the modal
                populateViewDetailsModal(book, buyerDetails, bookId);
            } else {
                console.error('No sold book data found for the given ID.');
            }
        } catch (error) {
            console.error('Error fetching sold book data:', error);
        }
    }
});


// Fetch buyer details from the database
async function fetchBuyerDetails(buyerId) {
    console.log(`Fetching buyer details for buyerId: ${buyerId}`);
    const userRef = ref(database, `users/${buyerId}`);
    return new Promise((resolve) => {
        onValue(userRef, (snapshot) => {
            const buyerData = snapshot.val();
            console.log('Buyer data snapshot:', buyerData);
            resolve(buyerData || {});
        }, { onlyOnce: true });
    });
}

// Populate the "View Details" modal with book and buyer details
function populateViewDetailsModal(book, buyer, bookId) {
    console.log('Populating modal with book and buyer details...');
    const modalEl = document.getElementById('viewDetailsModal');

    // Set book details
    document.getElementById('moreInfoBookImage').src = book.imageUrl || 'images/default-book.png';
    document.getElementById('moreInfoBookTitle').textContent = book.title || 'N/A';
    document.getElementById('moreInfoAuthor').textContent = book.author || 'N/A';
    document.getElementById('moreInfoGenre').textContent = book.genre || 'N/A';
    document.getElementById('moreInfoCondition').textContent = book.condition || 'N/A';
    document.getElementById('moreInfoPrice').textContent = book.price || 'N/A';

    // Set buyer details
    document.getElementById('buyerName').textContent = `${buyer.firstName || 'N/A'} ${buyer.lastName || ''}`;
    document.getElementById('dateSold').textContent = new Date(book.dateSold).toLocaleString() || 'N/A';
    document.getElementById('soldBooksId').textContent = bookId || 'N/A';

    console.log('Modal populated successfully.');

    // Show the modal dynamically
    const viewDetailsModal = bootstrap.Modal.getOrCreateInstance(modalEl);
    viewDetailsModal.show();
}

