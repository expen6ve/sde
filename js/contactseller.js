import { getDatabase, ref, get, push, set } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";

// Variables for message modal
let selectedSellerId = null;
let currentUser = null;
const database = getDatabase();

// Function to initialize the chat modal
export function openChatModal(sellerId, currentUserId, bookTitle, bookImageUrl) {
    selectedSellerId = sellerId; // Save selected seller
    currentUser = currentUserId; // Save current user

    // Save book title and image for later use
    window.selectedBookTitle = bookTitle;
    window.selectedBookImageUrl = bookImageUrl;

    if (!selectedSellerId || !currentUser) {
        console.error('Error: selectedSellerId or currentUser is not defined.');
        return;
    }

    const modal = new bootstrap.Modal(document.getElementById('messageModal'));
    modal.show();
}


// Check if chat between two users exists
export async function checkExistingChat(sellerId) {
    const chatKey1 = `${currentUser}_${sellerId}`;
    const chatKey2 = `${sellerId}_${currentUser}`;

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
export async function sendMessage(messageInput) {
    const message = messageInput.value.trim();

    // Check if message is not empty
    if (!message) {
        console.error('Error: Message is empty.');
        return;
    }

    // Ensure selectedSellerId and currentUser are defined
    if (!selectedSellerId || !currentUser) {
        console.error('Error: selectedSellerId or currentUser is not defined.');
        return;
    }

    let chatKey = await checkExistingChat(selectedSellerId);

    if (!chatKey) {
        // No existing chat, create a new one
        chatKey = `${currentUser}_${selectedSellerId}`;
    }

    // Check if chatKey is properly formed
    if (!chatKey) {
        console.error('Error: chatKey is not defined.');
        return;
    }

    const chatRef = push(ref(database, `chats/${chatKey}`));

    try {
        await set(chatRef, {
            sender: currentUser,
            receiver: selectedSellerId,
            message,
            timestamp: Date.now(),
            bookTitle: window.selectedBookTitle, // Include book title
            bookImageUrl: window.selectedBookImageUrl, // Include book image
        });
        messageInput.value = ''; // Clear input
        window.location.href = 'chat.html'; // Redirect to chat page
    } catch (error) {
        console.error('Error sending message:', error);
    }
}
