import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";
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

    // Redirect to login page
    const myButton = document.getElementById('signinbutton');
    if (myButton) {
        myButton.addEventListener('click', function() {
            window.location.href = 'login.html';
        });
    }
    
    const user = await checkAuth();
    const bookListContainer = document.querySelector('.row.gx-4.gx-lg-5');
    const genreDropdownItems = document.querySelectorAll('#genreDropdown + .dropdown-menu .dropdown-item');
    const genreHeading = document.getElementById('genreHeading');
    const logoLink = document.querySelector('.navbar-brand');
    const profileDropdown = document.querySelector('#profileDropdown'); // Profile dropdown menu
    const messagesDropdown = document.querySelector('#messagesDropdown'); // Messages dropdown menu

    // Handle redirection based on user authentication
    if (!user) {
        // For non-logged in users
        logoLink.href = 'index.html';
        if (profileDropdown) profileDropdown.style.display = 'none';
        if (messagesDropdown) messagesDropdown.style.display = 'none';
    } else {
        // For logged in users
        logoLink.href = 'userhome.html';
        if (profileDropdown) profileDropdown.style.display = 'block';
        if (messagesDropdown) messagesDropdown.style.display = 'block';
    }

    // Reference to the book listings and users in Firebase
    const booksRef = ref(database, 'book-listings');
    const usersRef = ref(database, 'users');

    function displayBooks(genre) {
        onValue(booksRef, (snapshot) => {
            const bookData = snapshot.val();
            bookListContainer.innerHTML = '';

            if (bookData) {
                // Create a cache for user names
                const userNames = {};

                onValue(usersRef, (userSnapshot) => {
                    const userData = userSnapshot.val();

                    if (userData) {
                        Object.keys(userData).forEach(userId => {
                            userNames[userId] = userData[userId].firstName || 'Unknown';
                        });

                        // Update the genre heading
                        genreHeading.textContent = genre;

                        // Now display books
                        Object.keys(bookData).forEach(key => {
                            const book = bookData[key];
                            if (book.genre === genre) {
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
                        bookListContainer.innerHTML = '<p>No books available in this genre.</p>';
                    }
                });
            } else {
                bookListContainer.innerHTML = '<p>No books available in this genre.</p>';
            }
        });
    }

    // Set up dropdown menu click listeners
    genreDropdownItems.forEach(item => {
        item.addEventListener('click', (event) => {
            const selectedGenre = event.target.getAttribute('data-genre');
            displayBooks(selectedGenre);

            // Update the URL without reloading the page
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.set('genre', selectedGenre);
            window.history.pushState({}, '', newUrl);
        });
    });

    // Handle initial display based on the current genre
    const urlParams = new URLSearchParams(window.location.search);
    const genre = urlParams.get('genre');
    if (genre) {
        displayBooks(genre);
    }
});
