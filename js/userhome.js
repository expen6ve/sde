import { checkAuth } from './auth.js';
import { getDatabase, ref, onValue, query, orderByChild } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";
import { initializeNavbar, handleSignOut } from './navbar.js';

// Initialize Firebase Database
const database = getDatabase();

// DOM elements
const bookListContainer = document.getElementById('bookListContainer');
const signOutButton = document.getElementById('signOut');

// Initialize Navbar
document.addEventListener('DOMContentLoaded', initializeNavbar);

// Display recently listed books
function displayRecentlyListedBooks() {
    // Query to get books ordered by `dateListed` in descending order
    const booksRef = query(ref(database, 'book-listings'), orderByChild('dateListed'));

    // Fetch books from Firebase
    onValue(booksRef, (snapshot) => {
        const bookData = snapshot.val();
        bookListContainer.innerHTML = ''; // Clear previous content
        if (bookData) {
            const booksArray = Object.entries(bookData).reverse(); // Reverse to show the most recent books first
            const userNames = {};

            // Fetch user data to map seller IDs to names
            onValue(ref(database, 'users'), (userSnapshot) => {
                const userData = userSnapshot.val();
                if (userData) {
                    Object.keys(userData).forEach(userId => {
                        userNames[userId] = userData[userId].firstName || 'Unknown';
                    });

                    // Loop through each book and display it
                    booksArray.forEach(([bookId, book]) => {
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
                    });
                }
            });
        } else {
            bookListContainer.innerHTML = '<p>No books available for sale.</p>';
        }
    });
}

// Event Listeners
document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkAuth();

    // Display recently listed books when the page loads
    displayRecentlyListedBooks();

    if (signOutButton) {
        signOutButton.addEventListener('click', handleSignOut);
    }
});
