import { getDatabase, ref, onValue, get, push, set } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";
import { checkAuth } from './auth.js';
import { initializeNavbar } from './navbar.js';

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
        second: 'numeric',
        hour12: true,
    });
}

function getOtherUserId(chatKey) {
    const [senderId, receiverId] = chatKey.split('_');
    return senderId === currentUser.uid ? receiverId : senderId;
}

function getLastMessage(chatMessages) {
    const otherUserMessages = Object.values(chatMessages).filter(msg => msg.sender !== currentUser.uid);
    return otherUserMessages.length > 0 ? otherUserMessages[otherUserMessages.length - 1] : { message: "No messages yet", timestamp: Date.now() };
}

async function createChatTab(chatKey, otherUser, lastMessage, chatList) {
    const otherUserName = otherUser ? `${otherUser.firstName} ${otherUser.lastName}` : 'Unknown User';
    const otherUserProfilePicture = otherUser?.profilePicture || 'https://via.placeholder.com/60';
    const lastMessageText = lastMessage.message || 'No messages yet';
    const lastMessageTime = formatTimestamp(lastMessage.timestamp);

    const chatTab = document.createElement('li');
    chatTab.classList.add('p-2', 'border-bottom');
    chatTab.innerHTML = `
        <a href="#" onclick="loadMessages('${chatKey}'); return false;" class="d-flex justify-content-between align-items-center">
            <div class="d-flex align-items-center">
                <img src="${otherUserProfilePicture}" class="rounded-circle me-3" width="45" height="45" alt="User Profile" onerror="this.onerror=null; this.src='https://via.placeholder.com/60';">
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
                    const lastMessage = getLastMessage(allChats[chatKey]);
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

window.loadMessages = function(chatKey) {
    if (selectedChatKey === chatKey && window.currentMessagesRef) {
        return; // Exit if trying to reload the already open chat
    }

    selectedChatKey = chatKey;
    const chatWindow = document.getElementById('chatBox');
    chatWindow.innerHTML = '';
    renderedMessages = {}; 

    showChatBox();

    if (window.currentMessagesRef) window.currentMessagesRef.off();

    currentMessagesRef = ref(database, `chats/${chatKey}`);
    onValue(currentMessagesRef, async (snapshot) => {
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
                    chatWindow.innerHTML += createMessageElement(msg, isCurrentUser, profilePicture, formattedTime);
                    renderedMessages[msgKey] = true;
                }
            }));
            scrollToBottom();
        } else {
            chatWindow.innerHTML = '<p class="text-muted">No messages yet.</p>';
        }
    });

    hideUnreadMessageIndicator(chatKey);
};

function createMessageElement(msg, isCurrentUser, profilePicture, formattedTime) {
    return `
        <div class="d-flex flex-row ${isCurrentUser ? 'justify-content-end' : 'align-items-start'} mb-3">
            ${isCurrentUser ? `
                <div class="me-3">
                    <p class="small p-2 text-white rounded-3 bg-primary mb-1">${msg.message}</p>
                    <p class="small text-muted">${formattedTime}</p>
                </div>
                <img src="${profilePicture}" alt="User Avatar" class="rounded-circle" style="width: 45px; height: 45px;" onerror="this.onerror=null; this.src='https://via.placeholder.com/60';">
            ` : `
                <img src="${profilePicture}" alt="Other User Avatar" class="rounded-circle" style="width: 45px; height: 45px;" onerror="this.onerror=null; this.src='https://via.placeholder.com/60';">
                <div class="ms-3">
                    <p class="small p-2 mb-1 rounded-3 bg-body-tertiary">${msg.message}</p>
                    <p class="small text-muted">${formattedTime}</p>
                </div>
            `}
        </div>`;
}

function hideUnreadMessageIndicator(chatKey) {
    const chatTab = document.querySelector(`#sellerChatTab a[href="#"][onclick="loadMessages('${chatKey}'); return false;"]`);
    if (chatTab) {
        const lastMessageTextElement = chatTab.querySelector('.small.text-muted');
        if (lastMessageTextElement) {
            lastMessageTextElement.style.display = 'none'; 
        }
    }
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
            timestamp: Date.now()
        }).then(() => {
            messageInput.value = '';
        }).catch(error => {
            console.error('Error sending message:', error);
        });
    }
});
