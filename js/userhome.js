import { checkAuth } from './auth.js';
import { getDatabase, ref, onValue, set, push, get } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";
import { initializeNavbar, handleSignOut } from './navbar.js';

// Initialize Firebase Database
const database = getDatabase();

// DOM elements
const bookListContainer = document.getElementById('bookListContainer');
const signOutButton = document.getElementById('signOut');

// Variables for message modal
let selectedSellerId = null;
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
                                            <button class="btn btn-success" 
                                            data-seller="${book.userId}" 
                                            data-title="${book.title}" 
                                            onclick="openChatModal('${book.userId}')">
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

// Open chat modal
window.openChatModal = function (sellerId) {
    selectedSellerId = sellerId; // Save selected seller
    const modal = new bootstrap.Modal(document.getElementById('messageModal'));
    modal.show();
};

// Check if chat between two users exists
async function checkExistingChat(sellerId) {
    const chatKey1 = `${currentUser.uid}_${sellerId}`;
    const chatKey2 = `${sellerId}_${currentUser.uid}`;

    try {
        const chat1 = await get(ref(database, `chats/${chatKey1}`));
        const chat2 = await get(ref(database, `chats/${chatKey2}`));

        if (chat1.exists()) {
            return chatKey1;  // Return existing chat
        } else if (chat2.exists()) {
            return chatKey2;  // Return existing chat
        } else {
            return null;  // No existing chat
        }
    } catch (error) {
        console.error('Error checking for existing chat:', error);
        return null;
    }
}

// Send message to seller
document.getElementById('sendMessageBtn').addEventListener('click', async () => {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();

    if (message) {
        let chatKey = await checkExistingChat(selectedSellerId);

        if (!chatKey) {
            // No existing chat, create a new one
            chatKey = `${currentUser.uid}_${selectedSellerId}`;
        }

        const chatRef = push(ref(database, `chats/${chatKey}`));
        set(chatRef, {
            sender: currentUser.uid,
            receiver: selectedSellerId,
            message,
            timestamp: Date.now()
        }).then(() => {
            messageInput.value = ''; // Clear input
            window.location.href = 'chat.html'; // Redirect to chat page
        });
    }
});
