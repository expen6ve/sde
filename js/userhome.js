import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { initializeNavbar } from './navbar.js';
import { checkAuth } from './auth.js';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCN8NcVQNRjAF_A86a8NfxC9Audivokuso",
    authDomain: "sde-ecoread.firebaseapp.com",
    databaseURL: "https://sde-ecoread-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "sde-ecoread",
    storageBucket: "sde-ecoread.appspot.com",
    messagingSenderId: "137637739158",
    appId: "1:137637739158:web:c9b885cf9025c89e2c60b7"
};

// Initialize Firebase
initializeApp(firebaseConfig);

// Initialize Navbar
document.addEventListener('DOMContentLoaded', initializeNavbar);

function handleReadMoreClick() {
    const cardText = this.previousElementSibling;
    const isHidden = cardText.classList.toggle('text-hidden');
    this.textContent = isHidden ? 'Read More' : 'Read Less';
}

function setupEventListeners() {
    const readMoreLinks = document.querySelectorAll('.read-more'); // Selecting all read-more elements
    readMoreLinks.forEach(link => link.addEventListener('click', handleReadMoreClick));
}

// Main logic
document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkAuth();
    if (!user) {
        window.location.href = 'index.html';
    } else {
        setupEventListeners();
    }
});
