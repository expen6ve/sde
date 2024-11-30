import { getDatabase, ref, get, push, set } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";

let selectedSellerId = null;
let currentUser = null;
const database = getDatabase();

export async function openChatModal(sellerId, currentUserId, bookTitle, bookImageUrl) {
    selectedSellerId = sellerId; // Save selected seller
    currentUser = currentUserId; // Save current user

    // Save book details for later use
    window.selectedBookTitle = bookTitle;
    window.selectedBookImageUrl = bookImageUrl;

    // Fetch seller information from the database
    try {
        const sellerSnapshot = await get(ref(database, `users/${sellerId}`));
        if (sellerSnapshot.exists()) {
            const sellerData = sellerSnapshot.val();

            // Populate modal with seller's data
            const sellerProfileIcon = document.getElementById('sellerProfileIcon');
            const sellerName = document.getElementById('sellerName');

            const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '');
            const profileUrl = `${baseUrl}/manage-account.html?userId=${sellerId}`;

            // Make the profile picture clickable
            sellerProfileIcon.src = sellerData.profilePicture || 'default-profile.png'; // Default image if none
            sellerProfileIcon.parentElement.href = profileUrl; // Set <a> tag's href

            // Make the seller name clickable
            sellerName.textContent = sellerData.firstName || 'Unknown Seller';
            sellerName.parentElement.href = profileUrl; // Set <a> tag's href
        } else {
            console.error('Seller data not found.');
        }
    } catch (error) {
        console.error('Error fetching seller information:', error);
    }

    // Show the modal
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
