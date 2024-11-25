import { getDatabase, ref, onValue, get, push, set, update } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";
import { checkAuth } from './auth.js';
import { initializeNavbar } from './navbar.js';
import { loadUserBooks, loadShippingDetails, loadGcashDetails, editShippingDetailsBtn, saveShippingDetailsBtn, selectedBookKey } from './transactionHelper.js';


const database = getDatabase();
let currentUser = null;
let selectedChatKey = '';
let currentMessagesRef = null;
let renderedMessages = {};

document.addEventListener('DOMContentLoaded', async () => {
    currentUser = await checkAuth();
    if (!currentUser) return redirectToLogin();

    const userDetails = await fetchUserDetails(currentUser.uid);
    currentUser = { ...currentUser, ...userDetails };

    initializeNavbar();
    clearChatBox();
    loadChatList();
});

function redirectToLogin() {
    window.location.href = '/index.html';
}

async function fetchUserDetails(userId) {
    try {
        const userSnapshot = await get(ref(database, `users/${userId}`));
        return userSnapshot.exists() ? userSnapshot.val() : null;
    } catch (error) {
        console.error('Error fetching user details:', error);
        return null;
    }
}

function formatTimestamp(timestamp) {
    return new Date(timestamp).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: 'numeric',
        hour12: true,
    });
}

function getOtherUserId(chatKey) {
    const [senderId, receiverId] = chatKey.split('_');
    return senderId === currentUser.uid ? receiverId : senderId;
}

async function createChatTab(chatKey, otherUser, lastMessage, chatList) {
    const otherUserName = otherUser ? `${otherUser.firstName} ${otherUser.lastName}` : 'Unknown User';
    const otherUserProfilePicture = otherUser?.profilePicture || 'https://via.placeholder.com/60';
    const lastMessageText = lastMessage.message || 'No messages yet';

    // Check if the last message is read or not to conditionally hide/show
    const isRead = lastMessage.read || false;

    const chatTab = document.createElement('li');
    chatTab.classList.add('p-2', 'border-bottom');
    chatTab.innerHTML = `
        <a href="#" onclick="loadMessages('${chatKey}'); return false;" class="d-flex justify-content-between align-items-center" style="text-decoration: none;">
            <div class="d-flex align-items-center">
                <img src="${otherUserProfilePicture}" class="rounded-circle me-3" width="45" height="45" alt="User Profile" onerror="this.onerror=null; this.src='https://via.placeholder.com/60';">
                <div>
                    <p class="fw-bold mb-0">${otherUserName}</p>
                    <p class="small text-muted" style="display: ${isRead ? 'none' : 'block'};">${lastMessageText}</p>
                </div>
            </div>
        </a>`;
    chatList.appendChild(chatTab);
}

function getLastMessage(chatMessages, currentUser) {
    const messagesArray = Object.values(chatMessages);
    // Find the last message sent by the other user (not currentUser)
    const lastMessageFromOtherUser = messagesArray.reverse().find(msg => msg.sender !== currentUser.uid);
    
    return lastMessageFromOtherUser || { message: "No messages yet", timestamp: Date.now() };
}


async function loadChatList() {
    const chatList = document.getElementById('sellerChatTab');
    
    onValue(ref(database, 'chats/'), async (snapshot) => {
        const allChats = snapshot.val();
        chatList.innerHTML = '';

        if (allChats) {
            const chatArray = Object.keys(allChats)
                .filter(chatKey => chatKey.includes(currentUser.uid))
                .map(chatKey => {
                    const otherUserId = getOtherUserId(chatKey);
                    const lastMessage = getLastMessage(allChats[chatKey], currentUser);  // Pass currentUser here
                    return { chatKey, otherUserId, lastMessage };
                });

            chatArray.sort((a, b) => b.lastMessage.timestamp - a.lastMessage.timestamp);

            for (const chat of chatArray) {
                const otherUser = await fetchUserDetails(chat.otherUserId);
                createChatTab(chat.chatKey, otherUser, chat.lastMessage, chatList);
            }
        } else {
            chatList.innerHTML = '<li class="p-2 text-muted">No chats available.</li>';
        }
    });
}


function showChatBox() {
    document.getElementById('chatBox').classList.remove('d-none');
}

function scrollToBottom() {
    const chatWindow = document.getElementById('chatBox');
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

let currentMessagesListener = null;

async function markMessagesAsRead(chatKey) {
    const messagesRef = ref(database, `chats/${chatKey}`);
    const messagesSnapshot = await get(messagesRef);

    if (messagesSnapshot.exists()) {
        const updates = {};
        messagesSnapshot.forEach(childSnapshot => {
            const messageKey = childSnapshot.key;
            const messageData = childSnapshot.val();

            if (messageData.receiver === currentUser.uid && !messageData.read) {
                updates[`${messageKey}/read`] = true; // mark as read
            }
        });

        await update(messagesRef, updates);
    }
}

window.loadMessages = async function(chatKey) {
    if (selectedChatKey === chatKey && currentMessagesListener) return;

    selectedChatKey = chatKey;
    const chatWindow = document.getElementById('chatBox');
    chatWindow.innerHTML = '';
    renderedMessages = {};

    showChatBox();

    if (currentMessagesListener) {
        currentMessagesListener();
    }

    currentMessagesRef = ref(database, `chats/${chatKey}`);
currentMessagesListener = onValue(currentMessagesRef, async (snapshot) => {
    const messages = snapshot.val();
    if (messages) {
        await Promise.all(Object.keys(messages).map(async (msgKey) => {
            if (!renderedMessages[msgKey]) {
                const msg = messages[msgKey];
                const isCurrentUser = msg.sender === currentUser.uid;
                const otherUserId = isCurrentUser ? msg.receiver : msg.sender;
                const otherUser = await fetchUserDetails(otherUserId);
                const profilePicture = isCurrentUser ? currentUser.profilePicture : otherUser.profilePicture || 'https://via.placeholder.com/60';
                const formattedTime = formatTimestamp(msg.timestamp);

                // Check if this is a payment request
                if (msg.type === 'payment_request' && msg.receiver === currentUser.uid) {
                    alert(`You have a payment request for "${msg.bookTitle}".`);
                }


                chatWindow.innerHTML += createMessageElement(msg, isCurrentUser, profilePicture, formattedTime);
                renderedMessages[msgKey] = true;
            }
        }));
        scrollToBottom();
    } else {
        chatWindow.innerHTML = '<p class="text-muted">No messages yet.</p>';
    }
});


    await markMessagesAsRead(chatKey);
};

function createMessageElement(msg, isCurrentUser, profilePicture, formattedTime) {
    // Check if book information is included in the message
    const bookInfo = msg.bookTitle && msg.bookImageUrl ? `
        <div class="mt-2">
            <strong></strong> ${msg.bookTitle}
            <img src="${msg.bookImageUrl}" alt="${msg.bookTitle}" class="img-fluid mt-2" style="max-width: 50px; height: auto;">
        </div>
    ` : '';

    return `
        <div class="d-flex flex-row ${isCurrentUser ? 'justify-content-end' : 'align-items-start'} mb-3">
            ${isCurrentUser ? `
                <div class="me-3">
                    <p class="small p-2 text-white rounded-3 bg-secondary mb-1" style="font-family: monospace;">${msg.message}</p>
                    ${bookInfo}
                    <p class="small text-muted">${formattedTime}</p>
                </div>
                <img src="${profilePicture}" alt="User Avatar" class="rounded-circle" style="width: 45px; height: 45px;" onerror="this.onerror=null; this.src='https://via.placeholder.com/60';">
            ` : `
                <img src="${profilePicture}" alt="Other User Avatar" class="rounded-circle" style="width: 45px; height: 45px;" onerror="this.onerror=null; this.src='https://via.placeholder.com/60';">
                <div class="ms-3">
                    <p class="small p-2 mb-1 rounded-3 bg-body-tertiary" style="font-family: monospace;">${msg.message}</p>
                    ${bookInfo}
                    <p class="small text-muted">${formattedTime}</p>
                </div>
            `}
        </div>`;
}


function clearChatBox() {
    document.getElementById('chatBox').innerHTML = '<p class="text-muted">Select a chat to view messages.</p>';
}

const messageInput = document.getElementById('writeMessage');
const sendMessageButton = document.getElementById('sendMessageButton');

sendMessageButton.addEventListener('click', async (event) => {
    event.preventDefault();
    const message = messageInput.value.trim();

    if (message && selectedChatKey) {
        const receiverId = selectedChatKey.split('_').find(id => id !== currentUser.uid);
        const chatRef = push(ref(database, `chats/${selectedChatKey}`));

        await set(chatRef, {
            sender: currentUser.uid,
            receiver: receiverId,
            message,
            timestamp: Date.now(),
            read: false // default to unread
        }).then(() => {
            messageInput.value = '';
        }).catch(error => {
            console.error('Error sending message:', error);
        });
    }
});

messageInput.addEventListener('keydown', async (event) => {
    if (event.key === 'Enter') { // Check if Enter key is pressed
        event.preventDefault(); // Prevent default behavior (e.g., new line in the input)
        const message = messageInput.value.trim();

        if (message && selectedChatKey) {
            const receiverId = selectedChatKey.split('_').find(id => id !== currentUser.uid);
            const chatRef = push(ref(database, `chats/${selectedChatKey}`));

            await set(chatRef, {
                sender: currentUser.uid,
                receiver: receiverId,
                message,
                timestamp: Date.now(),
                read: false // default to unread
            }).then(() => {
                messageInput.value = ''; // Clear input field after sending
            }).catch(error => {
                console.error('Error sending message:', error);
            });
        }
    }
});

document.getElementById('confirmPaymentButton').addEventListener('click', async () => {
    try {
        if (!selectedBookKey) {
            console.error("No book selected");
            return;
        }

        console.log("Selected Book Key:", selectedBookKey);  // Debugging the selectedBookKey value
        const bookSnapshot = await get(ref(database, `book-listings/${selectedBookKey}`));
        if (!bookSnapshot.exists()) {
            console.error("Selected book does not exist");
            return;
        }

        const bookData = bookSnapshot.val();
        const receiverId = selectedChatKey.split('_').find(id => id !== currentUser.uid);

        // Construct the payment slip message
        const paymentSlipMessage = `Payment Requested for "${bookData.title}" - Price: ${bookData.price}`;

        // Save the payment slip to Firebase
        const chatRef = push(ref(database, `chats/${selectedChatKey}`));
        await set(chatRef, {
            sender: currentUser.uid,
            receiver: receiverId,
            message: paymentSlipMessage,
            timestamp: Date.now(),
            read: false, // default to unread
            bookTitle: bookData.title,
            bookImageUrl: bookData.imageUrl,
            type: 'payment_request' // Add a new type to indicate it's a payment request
        });
        

        // Notify the other user with an alert (temporary)
        alert(`Payment slip sent to ${receiverId} for "${bookData.title}".`);

        // Close the modal
        $('#requestPaymentModal').modal('hide');

    } catch (error) {
        console.error("Error sending payment slip:", error);
    }
});


document.getElementById('requestPaymentButtonTrigger').addEventListener('click', async () => {
    await loadUserBooks(currentUser);
    await loadGcashDetails(currentUser);
});

document.getElementById('shippingDetailsButton').addEventListener('click', () => {
    loadShippingDetails(currentUser);
});

document.getElementById('editShippingDetailsBtn').addEventListener('click', () => {
    editShippingDetailsBtn();
});

document.getElementById('saveShippingDetailsBtn').addEventListener('click', async () => {
    await saveShippingDetailsBtn(currentUser);
});
