import { checkAuth } from './auth.js';
import { getDatabase, ref, onValue, get } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";
import { initializeNavbar, handleSignOut } from './navbar.js';
import { openChatModal, sendMessage } from './contactseller.js';  // Import contact seller functions

// Initialize Firebase Database
const database = getDatabase();

// DOM elements
const bookListContainer = document.getElementById('bookListContainer');
const signOutButton = document.getElementById('signOut');

// Variables for message modal
let currentUser = null;

// Initialize Navbar
document.addEventListener('DOMContentLoaded', async () => {
    currentUser = await checkAuth();
    if (!currentUser) {
        window.location.href = 'index.html'; // Redirect if not logged in
        return;
    }
    initializeNavbar();
    displayRecentlyListedBooks();

    if (signOutButton) {
        signOutButton.addEventListener('click', handleSignOut);
    }
});

// Make the function globally accessible
window.openChatModal = openChatModal;  // Add the function to the global window object

// Display recently listed books
function displayRecentlyListedBooks() {
    const booksRef = ref(database, 'book-listings');
    onValue(booksRef, (snapshot) => {
        const bookData = snapshot.val();
        bookListContainer.innerHTML = ''; // Clear old content

        if (bookData) {
            const booksArray = Object.entries(bookData).reverse(); // Most recent first

            // Fetch user data to map seller IDs to names
            onValue(ref(database, 'users'), (userSnapshot) => {
                const userData = userSnapshot.val();
                const userNames = {};

                if (userData) {
                    Object.keys(userData).forEach(userId => {
                        userNames[userId] = userData[userId].firstName || 'Unknown';
                    });

                    booksArray.forEach(([bookId, book]) => {
                        bookListContainer.innerHTML += `
                        <div class="col-lg-3 col-md-6 mb-5">
                            <div class="card h-100 d-flex flex-column">
                                <div class="card-body d-flex flex-column">
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
                                    
                                    <!-- More Info button to open modal -->
                                    <div class="mt-2 mb-2">
                                        <button class="btn btn-primary w-100" onclick="openMoreInfoModal('${bookId}')">More Info</button>
                                    </div>
                    
                                    <!-- Contact Seller button at the bottom -->
                                    <div class="mt-auto">
                                        <button class="btn btn-success w-100" 
                                                data-seller="${book.userId}" 
                                                data-title="${book.title}" 
                                                data-image="${book.imageUrl || 'images/default-book.png'}" 
                                                onclick="openChatModal('${book.userId}', '${currentUser.uid}', '${book.title}', '${book.imageUrl || 'images/default-book.png'}')">
                                            Contact Seller
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        `;
                    });
                    
                }
            });
        } else {
            bookListContainer.innerHTML = '<p>No books available for sale.</p>';
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
