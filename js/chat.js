import { getDatabase, ref, onValue, get, push, set } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";
import { checkAuth } from './auth.js';
import { initializeNavbar } from './navbar.js';

const database = getDatabase();
let currentUser = null;
let selectedChatKey = ''; // Initialize the selected chat key
let currentMessagesRef = null; // Store the current messages reference

document.addEventListener('DOMContentLoaded', async () => {
    currentUser = await checkAuth();
    if (!currentUser) return redirectToLogin();

    initializeNavbar();
    clearChatBox();
    loadChatList();
});

// Redirect to index.html if user is not authenticated
function redirectToLogin() {
    window.location.href = '/index.html';
}

// Fetch user details by ID
async function fetchUserDetails(userId) {
    try {
        const userSnapshot = await get(ref(database, `users/${userId}`));
        return userSnapshot.exists() ? userSnapshot.val() : null;
    } catch (error) {
        console.error('Error fetching user details:', error);
        return null;
    }
}

// Format timestamp to "hour:minute:second AM/PM"
function formatTimestamp(timestamp) {
    return new Date(timestamp).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: true,
    });
}

// Create and append chat tab for each chat
function createChatTab(chatKey, otherUser, lastMessage, chatList) {
    const otherUserName = otherUser ? `${otherUser.firstName} ${otherUser.lastName}` : 'Unknown User';
    const otherUserProfilePicture = otherUser?.profilePicture || 'https://via.placeholder.com/60';
    const lastMessageText = lastMessage ? lastMessage.message : 'No messages yet';
    const lastMessageTime = formatTimestamp(lastMessage?.timestamp);

    const chatTab = document.createElement('li');
    chatTab.classList.add('p-2', 'border-bottom');
    chatTab.innerHTML = `
        <a href="#" onclick="loadMessages('${chatKey}'); return false;" class="d-flex justify-content-between align-items-center">
            <div class="d-flex align-items-center">
                <img src="${otherUserProfilePicture}" class="rounded-circle me-3" width="45" height="45" alt="User Profile">
                <div>
                    <p class="fw-bold mb-0">${otherUserName}</p>
                    <p class="small text-muted">${lastMessageText}</p>
                </div>
            </div>
            <div>
                <p class="small text-muted mb-1">${lastMessageTime}</p>
            </div>
        </a>`;
    chatList.appendChild(chatTab);
}

// Load chat list and render chat tabs dynamically
async function loadChatList() {
    const chatList = document.getElementById('sellerChatTab');
    onValue(ref(database, 'chats/'), async (snapshot) => {
        const allChats = snapshot.val();
        chatList.innerHTML = '';

        if (allChats) {
            const chatArray = Object.keys(allChats)
                .filter(chatKey => {
                    const [senderId, receiverId] = chatKey.split('_');
                    return senderId === currentUser.uid || receiverId === currentUser.uid;
                })
                .map(chatKey => {
                    const [senderId, receiverId] = chatKey.split('_');
                    const otherUserId = senderId === currentUser.uid ? receiverId : senderId;
                    const lastMessage = Object.values(allChats[chatKey]).pop();
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

// Show chatBox when user clicks on a chat tab
function showChatBox() {
    document.getElementById('chatBox').classList.remove('d-none');  // Show the chat box
}

window.loadMessages = function(chatKey) {
    selectedChatKey = chatKey; // Set selected chat key
    clearChatBox(); // Clear the chat box before loading messages
    showChatBox();  // Show the chat box

    // Remove previous listener if it exists and is valid
    if (window.currentMessagesRef && typeof window.currentMessagesRef.off === 'function') {
        window.currentMessagesRef.off(); // Remove the listener
    }

    // Create a new reference for the current chat
    const newMessagesRef = ref(database, `chats/${chatKey}`);

    // Set the new reference to window.currentMessagesRef
    window.currentMessagesRef = newMessagesRef;

    // Keep track of the messages already displayed to avoid duplication
    let renderedMessages = {};

    // Create a new listener callback function
    window.currentMessagesCallback = async (snapshot) => {
        const messages = snapshot.val();
        const chatWindow = document.getElementById('chatBox');
    
        chatWindow.innerHTML = '';  // Clear any previous content (including placeholder text)
    
        if (messages) {
            await Promise.all(Object.keys(messages).map(async (msgKey) => {
                if (!renderedMessages[msgKey]) { // Only render messages that haven't been displayed yet
                    const msg = messages[msgKey];
                    const isCurrentUser = msg.sender === currentUser.uid;
                    const otherUserId = isCurrentUser ? msg.receiver : msg.sender;
                    const otherUser = await fetchUserDetails(otherUserId);
                    const profilePicture = isCurrentUser ? otherUser?.profilePicture || 'https://via.placeholder.com/60' : 'https://mdbcdn.b-cdn.net/img/Photos/new-templates/bootstrap-chat/ava6-bg.webp';
                    const formattedTime = formatTimestamp(msg.timestamp);
    
                    chatWindow.innerHTML += `
                        <div class="d-flex flex-row ${isCurrentUser ? 'justify-content-end' : 'align-items-start'} mb-3">
                            ${isCurrentUser ? ` 
                                <div class="me-3">
                                    <p class="small p-2 text-white rounded-3 bg-primary mb-1">${msg.message}</p>
                                    <p class="small text-muted">${formattedTime}</p>
                                </div>
                                <img src="${profilePicture}" alt="User Avatar" class="rounded-circle" style="width: 45px; height: 45px;">
                            ` : `
                                <img src="${profilePicture}" alt="Seller Avatar" class="rounded-circle" style="width: 45px; height: 45px;">
                                <div class="ms-3">
                                    <p class="small p-2 mb-1 rounded-3 bg-body-tertiary">${msg.message}</p>
                                    <p class="small text-muted">${formattedTime}</p>
                                </div>
                            `}
                        </div>`;
    
                    // Mark the message as rendered
                    renderedMessages[msgKey] = true;
                }
            }));
        } else {
            chatWindow.innerHTML = '<p class="text-muted">No messages yet.</p>';  // If no messages exist
        }
    };
    

    // Set up the new listener for the current chat
    onValue(window.currentMessagesRef, window.currentMessagesCallback);
};



// Clear the chat box content
function clearChatBox() {
    document.getElementById('chatBox').innerHTML = '<p class="text-muted">Select a chat to view messages.</p>';
}

// Selectors for sending messages
const messageInput = document.getElementById('writeMessage');
const sendMessageButton = document.getElementById('sendMessageButton');

// Send message when button is clicked
sendMessageButton.addEventListener('click', async (event) => {
    event.preventDefault(); // Prevent default form submission behavior

    const message = messageInput.value.trim();

    if (message && selectedChatKey) {
        const chatRef = push(ref(database, `chats/${selectedChatKey}`));
        
        // Send the message to the database
        await set(chatRef, {
            sender: currentUser.uid,
            receiver: (currentUser.uid === selectedChatKey.split('_')[0]) ? selectedChatKey.split('_')[1] : selectedChatKey.split('_')[0],
            message,
            timestamp: Date.now()
        }).then(() => {
            messageInput.value = ''; // Clear the input field
            // No need to manually append the message here
            // The onValue listener will automatically update the UI
        }).catch(error => {
            console.error('Error sending message:', error);
        });
    }
});

