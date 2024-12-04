import { checkAuth } from './auth.js';
import { getDatabase, ref, get, push, set, update } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js";
import { initializeNavbar } from './navbar.js';

const database = getDatabase();
const storage = getStorage();
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const capitalize = str => str.charAt(0).toUpperCase() + str.slice(1);
const capitalizeWords = str => str.split(' ').map(capitalize).join(' ');

const getElementValue = id => document.getElementById(id).value.trim();
const setElementText = (id, text) => document.getElementById(id).textContent = text || 'Not provided';
const setImageSrc = (id, src) => document.getElementById(id).src = src || '';

async function fetchUserData(userId) {
    const userRef = ref(database, 'users/' + userId);
    const snapshot = await get(userRef);
    return snapshot.exists() ? snapshot.val() : null;
}

function updateDOMUserProfile(userData) {
    setElementText('userFullName', `${userData.firstName} ${userData.lastName}`);
    setImageSrc('userProfilePic', userData.profilePicture);
    setElementText('userGender', capitalize(userData.gender));
    
    const { birthDate, address, phone } = userData;
    setElementText('userBirthDate', birthDate ? `${months[birthDate.month - 1]} ${birthDate.day}, ${birthDate.year }` : '');
    setElementText('userAddress', address ? capitalizeWords(`${address.street}, ${address.barangay}, ${address.city}`) : '');
    setElementText('userPhoneNumber', phone ? ` ${phone}` : '');
}

async function fetchGCashDetails(userId) {
    const gcashRef = ref(database, `users/${userId}/gcash`);
    const snapshot = await get(gcashRef);

    if (snapshot.exists()) {
        const { gcashname, gcashnum } = snapshot.val();
        setElementText('gcashName', gcashname || 'Not provided');
        setElementText('gcashNum', gcashnum || 'Not provided');
    } else {
        setElementText('gcashName', 'Not provided');
        setElementText('gcashNum', 'Not provided');
    }
}

async function updateUserProfile() {
    const params = new URLSearchParams(window.location.search);
    const otherUserId = params.get('userId'); // Extract 'userId' from the URL if present
    const currentUser = await checkAuth(); // Get the currently logged-in user
    const userId = otherUserId || currentUser.uid; // If no 'userId' is in the URL, use the logged-in user's ID
    const isCurrentUser = userId === currentUser.uid; // Check if viewing own profile

    // Fetch user data and update the profile
    const userData = await fetchUserData(userId);
    if (userData) {
        updateDOMUserProfile(userData);
        await fetchGCashDetails(userId);
        await updateUserRecentListings(userId);

        // Show or hide the "Give a Review & Rating" button based on profile ownership
        const reviewRatingButton = document.getElementById('reviewRatingButton');
        if (reviewRatingButton) {
            reviewRatingButton.style.display = isCurrentUser ? 'none' : 'block';
        }

        // Change the button text depending on whether it's the current user or another user
        const editProfileButton = document.querySelector('#editProfileButton');
        if (editProfileButton) {
            if (isCurrentUser) {
                // If it's the current user, show "Edit Profile"
                editProfileButton.textContent = "Edit Profile";
                editProfileButton.setAttribute('data-bs-toggle', 'modal');
                editProfileButton.setAttribute('data-bs-target', '#editProfileModal');
            } else {
                // If it's another user, show "Send a Message"
                editProfileButton.textContent = "Send a Message";
                editProfileButton.removeAttribute('data-bs-toggle');
                editProfileButton.removeAttribute('data-bs-target');

                // Add event listener to open the modal
                editProfileButton.addEventListener('click', () => openMessageModal(otherUserId));
            }
        }
    }
}


function openMessageModal(receiverId) {
    // Set the selected seller's ID
    window.selectedSellerId = receiverId;
    // Show the modal
    new bootstrap.Modal(document.getElementById('messageModal')).show();
}

document.getElementById('sendMessageBtn').addEventListener('click', async () => {
    const messageInput = document.getElementById('messageInput');
    await sendMessage(messageInput);
});

async function sendMessage(messageInput) {
    const message = messageInput.value.trim();

    if (!message) {
        console.error('Error: Message is empty.');
        return;
    }

    // Ensure selectedSellerId and currentUser are defined
    const currentUser = await checkAuth();
    if (!window.selectedSellerId || !currentUser) {
        console.error('Error: selectedSellerId or currentUser is not defined.');
        return;
    }

    // Check if chat exists
    let chatKey = await checkExistingChat(window.selectedSellerId, currentUser);

    if (!chatKey) {
        chatKey = `${currentUser.uid}_${window.selectedSellerId}`;
    }

    const chatRef = push(ref(database, `chats/${chatKey}`));

    try {
        await set(chatRef, {
            sender: currentUser.uid,
            receiver: window.selectedSellerId,
            message,
            timestamp: Date.now(),
        });

        messageInput.value = ''; // Clear input
        const messageModal = bootstrap.Modal.getInstance(document.getElementById('messageModal'));
        messageModal.hide();

        console.log('Message sent successfully!');
    } catch (error) {
        console.error('Error sending message:', error);
    }
}


async function checkExistingChat(sellerId, currentUser) {
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

async function updateUserRecentListings(userId) {
    const listingsRef = ref(database, 'book-listings');
    const snapshot = await get(listingsRef);
    const userRecentListingElement = document.getElementById('userRecentListing');
    userRecentListingElement.innerHTML = '';  // Clear existing content

    if (snapshot.exists()) {
        const allListings = snapshot.val();
        const userListings = Object.keys(allListings)
            .filter(key => allListings[key].userId === userId)
            .map(key => ({ id: key, ...allListings[key] }))
            .sort((a, b) => new Date(b.dateListed) - new Date(a.dateListed));

        if (userListings.length) {
            const { title, author, condition, price, imageUrl } = userListings[0];
            userRecentListingElement.innerHTML = `
                <div class="card h-100 mb-3">
                    <div class="card-body">
                        <div class="d-flex justify-content-center">
                            <img src="${imageUrl || 'images/default-book.png'}" class="img-fluid" alt="Book Image" style="height: 200px; object-fit: cover;">
                        </div>
                        <h4 class="card-title mt-3 fs-5">${title}</h4>
                        <p class="card-text mb-0 user-info-font"><strong>Author:</strong> ${author}</p>
                        <p class="card-text mb-0 user-info-font"><strong>Condition:</strong> ${condition}</p>
                        <p class="card-text mb-0 user-info-font"><strong>Price:</strong> ₱${price}</p>
                    </div>
                </div>
                `;
        } else {
            userRecentListingElement.innerHTML = '<p>No recent listings available.</p>';
        }
    }
}

// Handle profile update
document.getElementById('saveProfileChangesButton').addEventListener('click', async () => {
    const user = await checkAuth();
    if (!user) return;

    const currentUserData = await fetchUserData(user.uid);
    const updatedProfileData = {};

    const updateIfFilled = (field, value) => value ? updatedProfileData[field] = value : null;

    updateIfFilled('firstName', getElementValue('editFirstName'));
    updateIfFilled('lastName', getElementValue('editLastName'));
    updateIfFilled('gender', getElementValue('editGender'));
    updateIfFilled('phone', getElementValue('editPhoneNumber'));

    const addressFields = {
        editStreet: 'street',
        editBarangay: 'barangay',
        editCity: 'city',
        editProvince: 'province',
        editZipCode: 'zipCode'
    };
    
    const updatedAddress = {};
    Object.entries(addressFields).forEach(([fieldId, fieldKey]) => {
        const value = getElementValue(fieldId);
        if (value) updatedAddress[fieldKey] = value;
    });
    
    if (Object.keys(updatedAddress).length) {
        updatedProfileData.address = { ...currentUserData.address, ...updatedAddress };
    }
    

    const [day, month, year] = ['user-day', 'user-month', 'user-year'].map(getElementValue);
    if (day && month && year) {
        updatedProfileData.birthDate = { day, month, year };
    }

    const profileImageFile = document.getElementById('profilePicture').files[0];

    try {
        await updateProfileInFirebase(user, updatedProfileData, profileImageFile);
        alert("Profile updated successfully!");
        await updateUserProfile();
        bootstrap.Modal.getInstance(document.getElementById('editProfileModal')).hide();
    } catch (error) {
        console.error("Error updating profile: ", error);
        alert("Failed to update profile. Please try again.");
    }
});

// Preview selected image
document.getElementById('profilePicture').addEventListener('change', function() {
    const file = this.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = e => { document.getElementById('profilePicturePreview').src = e.target.result; };
        reader.readAsDataURL(file);
    }
});

// Update Firebase profile and image
async function updateProfileInFirebase(user, updatedProfileData, profileImageFile) {
    const userRef = ref(database, `users/${user.uid}`);
    
    if (profileImageFile) {
        const profileImageRef = storageRef(storage, `profilePictures/${user.uid}`);
        const snapshot = await uploadBytes(profileImageRef, profileImageFile);
        updatedProfileData.profilePicture = await getDownloadURL(snapshot.ref);
    }
    
    await update(userRef, updatedProfileData);
}

document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkAuth();
    if (user) {
        initializeNavbar();
        await updateUserProfile();
    } else {
        window.location.href = '/index.html';
    }
});

  // Star Rating JavaScript
  const stars = document.querySelectorAll('.star-rating .star');
  const ratingInput = document.getElementById('rating');

  stars.forEach(star => {
    star.addEventListener('click', function() {
      const selectedRating = parseInt(this.getAttribute('data-index'));
      ratingInput.value = selectedRating;
      
      // Update star display after selection
      stars.forEach(star => {
        star.classList.remove('checked');
      });

      for (let i = 0; i < selectedRating; i++) {
        stars[i].classList.add('checked');
      }
    });

    // Hover effect
    star.addEventListener('mouseover', function() {
      const hoveredRating = parseInt(this.getAttribute('data-index'));

      // Highlight all stars up to the hovered one
      stars.forEach(star => {
        star.classList.remove('hover');
      });

      for (let i = 0; i < hoveredRating; i++) {
        stars[i].classList.add('hover');
      }
    });

    star.addEventListener('mouseout', function() {
      // Remove hover effect when mouse leaves
      stars.forEach(star => {
        star.classList.remove('hover');
      });
    });
  });

 // Handle review submission
 document.getElementById('submitReviewBtn').addEventListener('click', async function () {
    const rating = parseInt(ratingInput.value);
    const reviewText = document.getElementById('reviewText').value.trim();
    const sellerId = new URLSearchParams(window.location.search).get('userId'); // Get sellerId from URL
    const currentUser = await checkAuth();

    // Validate input
    if (rating === 0 || reviewText === '') {
        alert('Please provide a rating and a review.');
        return;
    }

    try {
        // Create a new review object
        const reviewData = {
            sellerId: sellerId, // Seller ID from the URL
            buyerId: currentUser.uid, // Current user as buyer
            rating: rating, // Rating (1-5 stars)
            reviewText: reviewText, // Review text
            timestamp: Date.now(), // Timestamp for the review
        };

        // Push the review data to Firebase under 'feedbacks'
        const feedbacksRef = ref(database, `feedbacks/${sellerId}`);
        const newFeedbackRef = push(feedbacksRef); // Generate a unique feedbackId within the seller's node
        await set(newFeedbackRef, reviewData);

        // Print overall rating in the console
        await getOverallRating(sellerId);

        // Confirmation message
        alert(`Review submitted! Rating: ${rating} stars. Review: ${reviewText}`);

        // Optionally, close the modal after submission
        const reviewModal = bootstrap.Modal.getInstance(document.getElementById('reviewModal'));
        reviewModal.hide();

        // Optionally, redirect to the seller's profile or refresh the page
        window.location.href = `manage-account.html?userId=${sellerId}`;
    } catch (error) {
        console.error('Error submitting review:', error);
        alert('Failed to submit your review. Please try again.');
    }
});

// Function to calculate overall rating
async function getOverallRating(sellerId) {
    const feedbacksRef = ref(database, `feedbacks/${sellerId}`);
    const snapshot = await get(feedbacksRef);

    if (snapshot.exists()) {
        const feedbacks = snapshot.val();
        const ratings = Object.values(feedbacks).map(feedback => feedback.rating);

        // Calculate average rating
        const totalRatings = ratings.reduce((sum, rating) => sum + rating, 0);
        const overallRating = ratings.length > 0 ? (totalRatings / ratings.length).toFixed(2) : 0;

        console.log(`Overall Rating for seller ${sellerId}: ${overallRating}`);
        return overallRating;
    } else {
        console.log(`No feedbacks found for seller ${sellerId}`);
        return 0; // No feedbacks, so rating is 0
    }
}
