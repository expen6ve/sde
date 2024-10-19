import { getDatabase, ref, onValue, push, set, child, get } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";
import { checkAuth } from './auth.js';

const database = getDatabase();

// Get the sellerId and book title from the query parameters
const urlParams = new URLSearchParams(window.location.search);
const sellerId = urlParams.get('sellerId');

// DOM elements
const userChatBubble = document.getElementById('userChatBubble');
const sellerChatBubble = document.getElementById('sellerChatBubble');
const writeMessageInput = document.getElementById('writeMessage');
const sendMessageButton = document.getElementById('sendMessage');
const userProfile = document.getElementById('userProfile');
const sellerProfile = document.getElementById('sellerProfile');
const sellerName = document.getElementById('sellerName');

// Initialize chat on page load
document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkAuth();
    if (!user) {
        window.location.href = 'index.html';
        return;
    }

    loadUserProfiles(user.uid, sellerId);
    loadChatMessages(user.uid, sellerId);

    sendMessageButton.addEventListener('click', () => sendMessage(user.uid, sellerId));
});

// Load user and seller profile pictures
async function loadUserProfiles(userId, sellerId) {
    const userRef = ref(database, `users/${userId}`);
    const sellerRef = ref(database, `users/${sellerId}`);

    const userSnapshot = await get(userRef);
    const sellerSnapshot = await get(sellerRef);

    if (userSnapshot.exists()) {
        userProfile.src = userSnapshot.val().profilePicture || 'images/default-user.png';
    }
    if (sellerSnapshot.exists()) {
        sellerProfile.src = sellerSnapshot.val().profilePicture || 'images/default-user.png';
        sellerName.textContent = `${sellerSnapshot.val().firstName} ${sellerSnapshot.val().lastName}`;
    }
}

// Load chat messages from Firebase
function loadChatMessages(userId, sellerId) {
    const chatRef = ref(database, `chats/${userId}_${sellerId}`);
    onValue(chatRef, (snapshot) => {
        const chatContainer = document.querySelector('.pe-3'); // Chat messages container
        chatContainer.innerHTML = ''; // Clear previous messages

        snapshot.forEach((messageSnapshot) => {
            const message = messageSnapshot.val();
            const bubble = message.senderId === userId ? userChatBubble.cloneNode(true) : sellerChatBubble.cloneNode(true);

            bubble.querySelector('#messageSentDisplayed').textContent = message.text;
            bubble.querySelector('#messageTimeStamp').textContent = message.timestamp;
            chatContainer.appendChild(bubble);
        });
    });
}

// Send a new message to Firebase
function sendMessage(userId, sellerId) {
    const messageText = writeMessageInput.value.trim();
    if (messageText === '') return;

    const chatRef = ref(database, `chats/${userId}_${sellerId}`);
    const newMessageRef = push(chatRef);

    const timestamp = new Date().toLocaleString();

    set(newMessageRef, {
        senderId: userId,
        text: messageText,
        timestamp: timestamp
    });

    writeMessageInput.value = ''; // Clear the input field
}
