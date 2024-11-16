import { checkAuth } from './auth.js';
import { getDatabase, ref, get, onValue, query, orderByChild } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";

// Initialize Firebase Database
const database = getDatabase();

// DOM elements
const bookListContainer = document.getElementById('bookListContainer');

// Check if the user is authenticated
async function redirectIfAuthenticated() {
    const user = await checkAuth();
    if (user) {
        window.location.href = 'userhome.html'; // Redirect to user home if logged in
    }
}

// Function to set up logo redirection based on user authentication
async function setupLogoRedirection() {
    const logo = document.getElementById('logo');
    
    if (logo) {
        logo.addEventListener('click', async () => {
            const user = await checkAuth();
            if (user) {
                window.location.href = 'userhome.html'; // Redirect to user home if logged in
            } else {
                window.location.href = 'index.html'; // Stay on index page if not logged in
            }
        });
    } else {
        console.error('Logo element not found.');
    }
}

// Function to handle "Sign In" button click
function setupSigninButton() {
    const signinButton = document.getElementById('signinbutton');
    if (signinButton) {
        signinButton.addEventListener('click', () => {
            window.location.href = 'login.html'; // Redirect to login page
        });
    }
}

// Function to handle genre dropdown redirection
function setupGenreDropdown() {
    const genreDropdownItems = document.querySelectorAll('#genreDropdown .dropdown-item');
    genreDropdownItems.forEach(item => {
        item.addEventListener('click', (event) => {
            event.preventDefault();
            const selectedGenre = event.target.getAttribute('data-genre');
            if (selectedGenre) {
                window.location.href = `genre.html?genre=${encodeURIComponent(selectedGenre)}`;
            }
        });
    });
}

// Function to display recently listed books
function displayRecentlyListedBooks() {
    const booksRef = query(ref(database, 'book-listings'), orderByChild('dateListed'));

    // Fetch books from Firebase and display them
    onValue(booksRef, (snapshot) => {
        const bookData = snapshot.val();
        bookListContainer.innerHTML = ''; // Clear previous content

        if (bookData) {
            const booksArray = Object.entries(bookData).reverse(); // Most recent first
            const userNames = {};

            // Fetch user data to map seller IDs to names
            onValue(ref(database, 'users'), (userSnapshot) => {
                const userData = userSnapshot.val();
                if (userData) {
                    // Store user names based on userId
                    Object.keys(userData).forEach(userId => {
                        userNames[userId] = userData[userId].firstName || 'Unknown';
                    });

                    // Loop through each book and display it
                    booksArray.forEach(([bookId, book]) => {
                        const bookHtml = `
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
                                </div>
                            </div>
                        </div>
                        `;
                        bookListContainer.innerHTML += bookHtml; // Append each book's HTML
                    });
                }
            });
        } else {
            bookListContainer.innerHTML = '<p>No books available for sale.</p>';
        }
    });
}

// Set up all necessary listeners once DOM is fully loaded
document.addEventListener('DOMContentLoaded', async () => {
    await redirectIfAuthenticated(); // Check authentication first
    setupLogoRedirection();
    setupSigninButton();
    setupGenreDropdown();
    displayRecentlyListedBooks();
});
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