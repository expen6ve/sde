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

async function fetchAndDisplayFeedbacks(userId) {
    const feedbacksRef = ref(database, `feedbacks/${userId}`);
    const snapshot = await get(feedbacksRef);
    const feedbackContainer = document.getElementById('userFeedbacks');

    feedbackContainer.innerHTML = ''; // Clear existing content

    if (snapshot.exists()) {
        const feedbacks = snapshot.val();
        const feedbackKeys = Object.keys(feedbacks);

        // Sort feedbacks by timestamp in descending order (most recent first)
        feedbackKeys.sort((a, b) => feedbacks[b].timestamp - feedbacks[a].timestamp);

        // Loop through feedbacks and generate HTML
        for (const feedbackKey of feedbackKeys) {
            const { buyerId, rating, reviewText } = feedbacks[feedbackKey];

            // Fetch the buyer's first name from the users node
            const buyerRef = ref(database, `users/${buyerId}`);
            const buyerSnapshot = await get(buyerRef);

            let buyerFirstName = "Unknown"; // Default value if no data found
            let buyerLastName = "Unknown"; // Default value if no data found
            if (buyerSnapshot.exists()) {
                const buyerData = buyerSnapshot.val();
                buyerFirstName = buyerData.firstName; // Get the first name of the buyer
                buyerLastName = buyerData.lastName; // Get the last name of the buyer
            }

            // Generate star ratings dynamically
            const stars = Array(5)
                .fill('<i class="fa fa-star text-muted" style="font-size: 1.5rem;"></i>') // Unfilled star
                .map((star, index) => index < rating ? '<i class="fa fa-star text-warning" style="font-size: 1.5rem;"></i>' : star) // Filled star
                .join('');

            // Feedback card HTML
            const feedbackHTML = `
                <div class="feedback-card mb-3 p-3 border rounded bg-light" style="width: 100%;">
                    <h5 class="buyer-name text-primary">${buyerFirstName} ${buyerLastName}</h5> 
                    <div class="rating mb-2">
                        ${stars} <span class="rating-number">(${rating} stars)</span>
                    </div>
                    <div class="lineseparator border border-top-1 custombg-bwhite"></div>
                    <p class="review-text text-secondary" style="font-size: 1.2rem;">${reviewText}</p>
                </div>
            `;

            feedbackContainer.innerHTML += feedbackHTML; // Append feedback card
        }
    } else {
        feedbackContainer.innerHTML = '<p>No feedback available.</p>';
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
        await fetchAndDisplayFeedbacks(userId); // Fetch and display feedbacks
        displayOverallRating(userId);

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
    userRecentListingElement.innerHTML = ''; // Clear existing content

    if (snapshot.exists()) {
        const allListings = snapshot.val();

        // Filter and sort listings by the user
        const userListings = Object.keys(allListings)
            .filter(key => allListings[key].userId === userId)
            .map(key => ({ id: key, ...allListings[key] }))
            .sort((a, b) => new Date(b.dateListed) - new Date(a.dateListed)); // Most recent first

        if (userListings.length) {
            // Create cards for each listing
            userListings.forEach(listing => {
                const { title, author, condition, price, imageUrl } = listing;

                const cardHTML = `
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

                // Append card to the listing container
                userRecentListingElement.innerHTML += cardHTML;
            });
        } else {
            userRecentListingElement.innerHTML = '<p>No recent listings available.</p>';
        }
    } else {
        userRecentListingElement.innerHTML = '<p>No recent listings available.</p>';
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
// Step 1: Check the transactions
async function getTransactionCount(currentUserId, sellerId) {
    const soldBooksRef = ref(database, 'sold-books');
    const snapshot = await get(soldBooksRef);
    
    if (!snapshot.exists()) return 0;  // If no transactions exist, return 0
    
    const transactions = snapshot.val();
    let transactionCount = 0;
    
    // Step 2: Check if current user and seller have completed a transaction together
    Object.values(transactions).forEach(transaction => {
        if ((transaction.buyerId === currentUserId && transaction.sellerId === sellerId) || 
            (transaction.buyerId === sellerId && transaction.sellerId === currentUserId)) {
            transactionCount++;  // Count matching transactions
        }
    });

    return transactionCount;
}

// Step 3: Check if the user can give a review based on the transaction count
async function canGiveReview(currentUserId, sellerId) {
    const transactionCount = await getTransactionCount(currentUserId, sellerId);
    const feedbacksRef = ref(database, `feedbacks/${sellerId}`);
    const feedbackSnapshot = await get(feedbacksRef);
    
    if (feedbackSnapshot.exists()) {
        const feedbacks = feedbackSnapshot.val();
        const feedbackGiven = Object.values(feedbacks).filter(feedback => feedback.buyerId === currentUserId).length;
        
        if (feedbackGiven >= transactionCount) {
            alert("You have already given feedback for all transactions with this seller.");
            return false;  // Can't give more feedback
        }
    }

    return true;  // Can give feedback
}

// Step 4: Handle the review submission process
document.getElementById('submitReviewBtn').addEventListener('click', async function () {
    const sellerId = new URLSearchParams(window.location.search).get('userId'); // Get sellerId from URL
    const currentUser = await checkAuth();  // Get the logged-in user
    
    // Step 5: Check if the user has exceeded their feedback limit
    const isAllowed = await canGiveReview(currentUser.uid, sellerId);
    
    if (!isAllowed) return;  // Prevent submitting feedback if the limit is reached

    const rating = parseInt(ratingInput.value);
    const reviewText = document.getElementById('reviewText').value.trim();
    
    // Validate input
    if (rating === 0 || reviewText === '') {
        alert('Please provide a rating and a review.');
        return;
    }

    try {
        // Create the review object
        const reviewData = {
            sellerId: sellerId,
            buyerId: currentUser.uid,
            rating: rating,
            reviewText: reviewText,
            timestamp: Date.now(),
        };

        // Push the review data to Firebase
        const feedbacksRef = ref(database, `feedbacks/${sellerId}`);
        const newFeedbackRef = push(feedbacksRef);
        await set(newFeedbackRef, reviewData);

        // Success message
        alert(`Review submitted! Rating: ${rating} stars. Review: ${reviewText}`);

        // Optionally, close the modal
        const reviewModal = bootstrap.Modal.getInstance(document.getElementById('reviewModal'));
        reviewModal.hide();

        // Refresh or redirect page after submission
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
        const overallRating = ratings.length > 0 ? (totalRatings / ratings.length).toFixed(1) : 0;

        console.log(`Overall Rating for seller ${sellerId}: ${overallRating}`);
        return overallRating;
    } else {
        console.log(`No feedbacks found for seller ${sellerId}`);
        return 0; // No feedbacks, so rating is 0
    }
}

async function displayOverallRating(sellerId) {
    const overallRatingElement = document.getElementById('overallRating');
    
    // Fetch the overall rating value
    const overallRating = await getOverallRating(sellerId);

    // Update the element's content
    overallRatingElement.textContent = parseFloat(overallRating).toFixed(1);
}

document.getElementById("verificationForm").addEventListener("submit", async (e) => {
    e.preventDefault(); // Prevent default form submission

    // Get the logged-in user's ID
    const auth = await checkAuth(); // Assuming checkAuth returns an object
    const userId = auth?.uid;

    if (!userId || typeof userId !== "string") {
        alert("You need to be logged in to submit this form.");
        return;
    }

    // Get form values
    const fullName = getElementValue("fullName");
    const fullAddress = getElementValue("fullAddress");
    const dob = getElementValue("dob");
    const idType = getElementValue("idType");
    const idNumber = getElementValue("idNumber");

    // Get file inputs
    const idFile = document.getElementById("idUpload").files[0];
    const selfieFile = document.getElementById("selfieUpload").files[0];

    if (!idFile || !selfieFile) {
        alert("Please upload all required files.");
        return;
    }

    try {
        // Upload files to Firebase Storage
        const idFilePath = `verification/${userId}/idFile-${Date.now()}`;
        const selfieFilePath = `verification/${userId}/selfieFile-${Date.now()}`;

        const idFileRef = storageRef(storage, idFilePath);
        const selfieFileRef = storageRef(storage, selfieFilePath);

        // Upload ID file
        await uploadBytes(idFileRef, idFile);
        const idFileUrl = await getDownloadURL(idFileRef);

        // Upload selfie file
        await uploadBytes(selfieFileRef, selfieFile);
        const selfieFileUrl = await getDownloadURL(selfieFileRef);

        // Define verifyStatus
        const verifyStatus = "pending";

        // Save verification data to Firebase Realtime Database
        const verificationRef = ref(database, `verificationtoconfirm/${userId}`);
        await set(verificationRef, {
            fullName,
            fullAddress,
            dob,
            idType,
            idNumber,
            idFileUrl,
            selfieFileUrl,
            verifyStatus,
            timestamp: new Date().toISOString(), // Optional: track submission time
        });

        // Update the user's "verifyStatus" in the "users" node
        const userRef = ref(database, `users/${userId}`);
        await update(userRef, {
            verifyStatus
        });

        alert("Verification form submitted successfully!");
        document.getElementById("verificationForm").reset(); // Reset the form
    } catch (error) {
        console.error("Error uploading files or saving data:", error);
        alert("An error occurred while submitting your verification form. Please try again.");
    }
});


document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const profileUserId = urlParams.get("userId"); // The user ID from the URL
    const currentUser = await checkAuth();  // Get the logged-in user

    if (!currentUser) {
        console.error("User not authenticated.");
        return;
    }

    // Extract the user ID (uid) from the current user object
    const currentUserId = currentUser.uid;

    // If no userId in URL, assume it's the logged-in user's profile
    const actualProfileUserId = profileUserId || currentUserId;

    // Debugging log to check the value of actualProfileUserId
    console.log("Profile User ID:", actualProfileUserId);
    
    // Ensure the ID is a string and not an object
    if (typeof actualProfileUserId !== 'string') {
        console.error("Invalid user ID: must be a string");
        return;
    }

    const verifyButtonContainer = document.getElementById("verifyButtonContainer");
    const customerStatusContainer = document.getElementById("customerStatusContainer");

    // Fetch verification status for the profile being viewed
    const verificationRef = ref(database, `verificationtoconfirm/${actualProfileUserId}`);
    const snapshot = await get(verificationRef);
    const verificationData = snapshot.exists() ? snapshot.val() : null;
    const isVerified = verificationData?.verifyStatus === "verified";

    // Determine if the logged-in user is viewing their own profile
    const isOwnProfile = currentUserId === actualProfileUserId;

    if (isOwnProfile) {
        // Logged-in user viewing their own profile
        if (isVerified) {
            // If verified, show customer_status
            verifyButtonContainer.classList.add("d-none");
            customerStatusContainer.classList.remove("d-none");
        } else {
            // If not verified, show "Verify" button
            verifyButtonContainer.classList.remove("d-none");
            customerStatusContainer.classList.add("d-none");
        }
    } else {
        // Logged-in user viewing another user's profile
        if (isVerified) {
            // If the other user is verified, show customer_status
            verifyButtonContainer.classList.add("d-none");
            customerStatusContainer.classList.remove("d-none");
        } else {
            // If the other user is not verified, hide both
            verifyButtonContainer.classList.add("d-none");
            customerStatusContainer.classList.add("d-none");
        }
    }
});

