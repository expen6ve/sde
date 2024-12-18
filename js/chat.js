import { getDatabase, ref, onValue, get, push, set, update, off } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";
import { checkAuth } from './auth.js';
import { initializeNavbar } from './navbar.js';
import { loadUserBooks, loadShippingDetails, loadGcashDetails, editShippingDetailsBtn, saveShippingDetailsBtn, confirmReqPaymentButton, viewPaymentSlip, paymentForTheBookIsSent, confirmPaidPayment } from './transactionHelper.js';


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

export function getOtherUserId(chatKey) {
    const [senderId, receiverId] = chatKey.split('_');
    return senderId === currentUser.uid ? receiverId : senderId;
}


async function createChatTab(chatKey, otherUser, lastMessage, chatList) {
    const otherUserName = otherUser ? `${otherUser.firstName} ${otherUser.lastName}` : 'Unknown User';
    const otherUserProfilePicture = otherUser?.profilePicture || 'https://via.placeholder.com/60';

    // Default last message text
    let lastMessageText = lastMessage.message || 'No messages yet';

    // Check if the last message includes "review"
    if (lastMessage.message && lastMessage.message.includes('Thank you for your purchase!')) {
        lastMessageText = "Seller wants your rate and review!";
    } 
    // Check if it's a payment slip with "Paid" or "To Pay"
    else if (lastMessage.message && (lastMessage.message.includes('Paid: ₱') || lastMessage.message.includes('To Pay: ₱'))) {
        const paidAmountMatch = lastMessage.message.match(/Paid: ₱\d+(\.\d{2})?/);
        const toPayAmountMatch = lastMessage.message.match(/To Pay: ₱\d+(\.\d{2})?/);

        if (paidAmountMatch) {
            lastMessageText = paidAmountMatch[0];
        } else if (toPayAmountMatch) {
            lastMessageText = toPayAmountMatch[0];
        }
    }

    const isRead = lastMessage.read || false;

    const chatTab = document.createElement('li');
    chatTab.classList.add('p-2', 'border-bottom');
    chatTab.innerHTML = `
        <a href="#" class="d-flex justify-content-between align-items-center" style="text-decoration: none;">
            <div class="d-flex align-items-center">
                <img src="${otherUserProfilePicture}" class="rounded-circle me-3" width="45" height="45" alt="User Profile" onerror="this.onerror=null; this.src='https://via.placeholder.com/60';">
                <div>
                    <p class="fw-bold mb-0">${otherUserName}</p>
                    <p class="small text-muted" style="display: ${isRead ? 'none' : 'block'};">${lastMessageText}</p>
                </div>
            </div>
        </a>`;

    chatList.appendChild(chatTab);

    // Add event listener for clicking the chat tab
    chatTab.querySelector('a').addEventListener('click', (event) => {
        event.preventDefault(); // Prevent default anchor behavior
        showChatBox(); // Ensure the chat box is shown
        loadMessages(chatKey); // Load the selected chat
    });
}





function getLastMessage(chatMessages, currentUser) {
    const messagesArray = Object.values(chatMessages);
    // Find the last message sent by the other user (not currentUser)
    const lastMessageFromOtherUser = messagesArray.reverse().find(msg => msg.sender !== currentUser.uid);
    
    return lastMessageFromOtherUser || { message: "", timestamp: Date.now() };
}


async function loadChatList() {
    const chatList = document.getElementById('sellerChatTab');
    chatList.innerHTML = '';  // Clear existing chat tabs

    onValue(ref(database, 'chats/'), async (snapshot) => {
        const allChats = snapshot.val();
        chatList.innerHTML = '';  // Clear existing chats

        if (allChats) {
            const chatArray = Object.keys(allChats)
                .filter(chatKey => chatKey.includes(currentUser.uid))
                .map(chatKey => {
                    const otherUserId = getOtherUserId(chatKey);
                    const lastMessage = getLastMessage(allChats[chatKey], currentUser);
                    return { chatKey, otherUserId, lastMessage };
                });

            chatArray.sort((a, b) => b.lastMessage.timestamp - a.lastMessage.timestamp);

            for (const chat of chatArray) {
                const otherUser = await fetchUserDetails(chat.otherUserId);
                await createChatTab(chat.chatKey, otherUser, chat.lastMessage, chatList);
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
    if (chatWindow) {
        // Use a timeout to ensure DOM updates have been rendered
        setTimeout(() => {
            chatWindow.scrollTop = chatWindow.scrollHeight;
        }, 0); // Minimal delay to wait for rendering
    }
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

window.loadMessages = async function (chatKey) {
    if (selectedChatKey === chatKey) return;

    selectedChatKey = chatKey;
    const chatWindow = document.getElementById('chatBox');
    chatWindow.innerHTML = '';  // Clear the previous chat window content.

    // Remove any existing listener before attaching a new one.
    if (currentMessagesRef) {
        off(currentMessagesRef);
    }

    renderedMessages = {}; // Reset for the new chat.
    currentMessagesRef = ref(database, `chats/${chatKey}`);

    currentMessagesListener = onValue(currentMessagesRef, async (snapshot) => {
        const messages = snapshot.val();
        
        // Don't clear chatWindow here, just append new messages.
        if (messages) {
            const messageKeys = Object.keys(messages);
            
            for (const msgKey of messageKeys) {
                if (!renderedMessages[msgKey]) {
                    renderedMessages[msgKey] = true;
                    const msg = messages[msgKey];
                    const isCurrentUser = msg.sender === currentUser.uid;
                    const otherUserId = isCurrentUser ? msg.receiver : msg.sender;
                    const otherUser = await fetchUserDetails(otherUserId);
                    const profilePicture = isCurrentUser
                        ? currentUser.profilePicture
                        : otherUser.profilePicture || 'https://via.placeholder.com/60';
                    const formattedTime = formatTimestamp(msg.timestamp);

                    // Append message to chat window
                    chatWindow.innerHTML += createMessageElement(
                        msg,
                        isCurrentUser,
                        profilePicture,
                        formattedTime,
                        otherUserId
                    );
                }
            }
            
            // Scroll to the bottom after new messages are rendered
            scrollToBottom();
        } else {
            chatWindow.innerHTML = '<p class="text-muted">No messages yet.</p>';
        }
    });

    await markMessagesAsRead(chatKey);
};

function createMessageElement(msg, isCurrentUser, profilePicture, formattedTime, otherUserId) {
    const bookInfo = msg.bookTitle && msg.bookImageUrl ? ` 
        <div class="mt-2">
            <strong>${msg.bookTitle}</strong>
            <img src="${msg.bookImageUrl}" alt="${msg.bookTitle}" class="img-fluid mt-2" style="max-width: 50px; height: auto;">
        </div>
    ` : '';

    // Show the "View Payment Slip" button only if the current user did NOT send the message
    const paymentSlipButton = msg.paymentSlip && !isCurrentUser ? ` 
        <button class="btn btn-sm btn-primary mt-2" onclick="viewPaymentSlip('${msg.paymentSlip}')">View Payment Slip</button>
    ` : '';

    // Show the "Confirm Payment" button only if the current user did NOT send the message
    const confirmPaymentButton = msg.confirmationSlip && !isCurrentUser ? `
    <div style="display: flex; justify-content: center; margin-top: 10px;">
        <button class="btn btn-primary" onclick="confirmPaidPayment('${msg.confirmationSlip}')">Confirm Payment</button>
    </div>
    ` : '';


    // Use dynamic base URL to support subdirectory deployment
    const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '');
    const profileUrl = isCurrentUser 
        ? `${baseUrl}/manage-account.html?userId=${currentUser.uid}` 
        : `${baseUrl}/manage-account.html?userId=${otherUserId}`;

    return `
        <div class="d-flex flex-row ${isCurrentUser ? 'justify-content-end' : 'align-items-start'} mb-3">
            ${isCurrentUser ? `
                <div class="me-3">
                    <p class="small p-2 text-white rounded-3 bg-secondary mb-1" style="font-family: monospace;">${msg.message}</p>
                    ${bookInfo}
                    ${paymentSlipButton} <!-- Conditionally rendered button -->
                    ${confirmPaymentButton} <!-- Conditionally rendered button -->
                    <p class="small text-muted">${formattedTime}</p>
                </div>
                <a href="${profileUrl}" class="ms-3">
                    <img src="${profilePicture}" alt="Current Logged User Avatar" class="rounded-circle" style="width: 45px; height: 45px;" onerror="this.onerror=null;">
                </a>
            ` : `
                <a href="${profileUrl}" class="me-3">
                    <img src="${profilePicture}" alt="Other User Avatar" class="rounded-circle" style="width: 45px; height: 45px;" onerror="this.onerror=null;">
                </a>
                <div class="ms-3">
                    <p class="small p-2 mb-1 rounded-3 bg-body-secondary" style="font-family: monospace;">${msg.message}</p>
                    ${bookInfo}
                    ${paymentSlipButton} <!-- Conditionally rendered button -->
                    ${confirmPaymentButton} <!-- Conditionally rendered button -->
                    <p class="small text-muted">${formattedTime}</p>
                </div>
            `}
        </div>
    `;
}


// Handle image preview for receipt upload
document.getElementById('receiptImage').addEventListener('change', function(event) {
    const file = event.target.files[0];
    const previewElement = document.getElementById('receiptPreview');
    
    if (file) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            previewElement.src = e.target.result;
            previewElement.style.display = 'block'; // Show the preview image
        };
        
        reader.readAsDataURL(file); // Convert the file to a data URL for preview
    } else {
        previewElement.style.display = 'none'; // Hide preview if no file is selected
    }
});


document.getElementById('paymentForTheBookIsSent').addEventListener('click', async () => {
    await paymentForTheBookIsSent(currentUser, selectedChatKey);
});

window.confirmPaidPayment = async (chatKey) => {
    await confirmPaidPayment(chatKey);
};

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
    if (!currentUser) {
        alert('You must be logged in to send a payment slip.');
        return;
    }

    if (!selectedChatKey) {
        alert('Please select a chat to proceed.');
        return;
    }

    await confirmReqPaymentButton(currentUser, selectedChatKey, renderedMessages); // Calling the imported function
});

window.viewPaymentSlip = async function(paymentSlipId) {
    await viewPaymentSlip(paymentSlipId); // Calling the imported function
};

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

window.redirectToReviewPage = function(sellerId) {
    const currentUserId = currentUser.uid;  // Assuming `currentUser.uid` holds the current user's ID

    // Check if the seller is the current user
    if (sellerId === currentUserId) {
        // Show a warning modal if the user tries to review themselves
        const modalContent = document.getElementById('warningModalContent');
        modalContent.innerHTML = `
            <div style="text-align: center;">
                <p><strong>You can't write a review and rate yourself!</strong></p>
            </div>
        `;

        const warningModal = new bootstrap.Modal(document.getElementById('warningModal'));
        warningModal.show();
    } else {
        // Redirect to the seller's profile page
        window.location.href = `manage-account.html?userId=${sellerId}`;
    }
};

document.querySelector('#search-addon').addEventListener('click', function() {
    const searchTerm = document.querySelector('.form-control').value.toLowerCase();
    filterChatList(searchTerm);
});

function filterChatList(searchTerm) {
    const chatList = document.getElementById('sellerChatTab');
    const allChats = document.querySelectorAll('#sellerChatTab li');  // Get all chat items

    allChats.forEach(chatTab => {
        const userName = chatTab.querySelector('.fw-bold').textContent.toLowerCase();  // Get the chat's user name
        if (userName.includes(searchTerm)) {
            chatTab.style.display = '';  // Show chat tab if it matches
        } else {
            chatTab.style.display = 'none';  // Hide chat tab if it doesn't match
        }
    });
}
