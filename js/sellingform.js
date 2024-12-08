import { checkAuth } from './auth.js';
import { initializeNavbar } from './navbar.js';
import { getDatabase, ref, get, set, update } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js";

const database = getDatabase();
const storage = getStorage();

// Check if the user is authenticated before loading the rest of the page
async function checkUserAuthentication() {
    const user = await checkAuth();
    if (!user) {
        window.location.href = 'login.html'; // Redirect to login if not authenticated
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await checkUserAuthentication();
    initializeNavbar();

    const user = await checkAuth();
    const userId = user.uid;

    const subscribeAlert = document.getElementById('subscribeAlert');
    const subscribeRejectedAlert = document.getElementById('subscribeRejectedAlert');
    const whyRejectedLink = document.getElementById('whyRejectedLink');
    const rejectionModal = new bootstrap.Modal(document.getElementById('rejectionModal'));  // Initialize the modal

    // Check subscription status
    try {
        const subscriptionRef = ref(database, `subscription/${userId}`);
        const snapshot = await get(subscriptionRef);

        if (snapshot.exists()) {
            const subscriptionData = snapshot.val();
            const { subStatus, rejectionMessage } = subscriptionData;  // Assuming rejectionMessage is part of the subscription data

            if (subStatus === 'subscribed') {
                // Hide the subscribe alert if the subscription is confirmed
                subscribeAlert.classList.add('d-none');
                subscribeRejectedAlert.classList.add('d-none');
            } else if (subStatus === 'denied') {
                // Show the denied subscription alert and hide the subscribe alert
                subscribeRejectedAlert.classList.remove('d-none');
                subscribeAlert.classList.add('d-none');
            } else {
                // Show the subscribe alert (already visible by default in HTML) for other statuses
                subscribeAlert.classList.remove('d-none');
                subscribeRejectedAlert.classList.add('d-none');
            }

            // If the rejection link is clicked, show the rejection message modal
            if (rejectionMessage && whyRejectedLink) {
                whyRejectedLink.addEventListener('click', (event) => {
                    event.preventDefault();  // Prevent default link behavior
                    document.getElementById('rejectionMessageBody').textContent = rejectionMessage;  // Set the rejection message
                    rejectionModal.show();  // Show the modal
                });
            }
        } else {
            // No subscription found, show the subscribe alert (default behavior)
            subscribeAlert.classList.remove('d-none');
            subscribeRejectedAlert.classList.add('d-none');
        }
    } catch (error) {
        console.error('Error checking subscription status:', error);
        alert('Failed to verify subscription status. Please try again later.');
    }
});


document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkAuth();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    const userId = user.uid;
    const gcashSetupSection = document.getElementById('gcash-setup-section');
    const bookListingSection = document.getElementById('book-listing-section');
    const gcashSetupForm = document.getElementById('gcash-setup-form');

    // Check if user has GCash details
    const gcashRef = ref(database, `users/${userId}/gcash`);
    const gcashSnapshot = await get(gcashRef);

    if (gcashSnapshot.exists()) {
        // User has GCash setup, show book listing form
        gcashSetupSection.classList.add('d-none');
        bookListingSection.classList.remove('d-none');
    } else {
        // User doesn't have GCash setup, show GCash form
        gcashSetupSection.classList.remove('d-none');
        bookListingSection.classList.add('d-none');
    }

    // Handle GCash form submission
    gcashSetupForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const gcashNumber = document.getElementById('gcash-number').value.trim();
        const gcashName = document.getElementById('gcash-name').value.trim();
        const qrCodeFile = document.getElementById('gcash-qr-code').files[0];

        if (!gcashNumber || !gcashName) {
            alert('Please fill out both GCash fields.');
            return;
        }

        let qrCodeUrl = '';
        if (qrCodeFile) {
            // Upload QR code image to Firebase Storage
            const qrCodeStorageRef = storageRef(storage, `gcash-qr-codes/${userId}-${Date.now()}`);
            await uploadBytes(qrCodeStorageRef, qrCodeFile);
            qrCodeUrl = await getDownloadURL(qrCodeStorageRef);
        }

        try {
            // Save GCash details to the database
            await set(ref(database, `users/${userId}/gcash`), {
                gcashnum: gcashNumber,
                gcashname: gcashName,
                qrCodeUrl: qrCodeUrl // Save the QR code URL if available
            });

            console.log('GCash details saved successfully!');

            // Show book listing form after GCash setup
            gcashSetupSection.classList.add('d-none');
            bookListingSection.classList.remove('d-none');
        } catch (error) {
            console.error('Error saving GCash details:', error);
            alert('Failed to save GCash details. Please try again.');
        }
    });

    // Preview the QR code image when selected
    const qrCodeInput = document.getElementById('gcash-qr-code');
    const qrPreview = document.getElementById('qr-preview');
    qrCodeInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                qrPreview.src = reader.result;
                qrPreview.style.display = 'block'; // Show the image preview
            };
            reader.readAsDataURL(file);
        } else {
            qrPreview.style.display = 'none'; // Hide if no file selected
        }
    });
});


// Initialize the page after checking authentication
document.addEventListener('DOMContentLoaded', async () => {
    await checkUserAuthentication(); // Ensure user is authenticated before proceeding
    initializeNavbar();

    // Form Elements
    const bookTitleInput = document.getElementById('book-title');
    const authorInput = document.getElementById('author');
    const genreInput = document.getElementById('genre');
    const conditionInput = document.getElementById('book-condition');
    const descriptionInput = document.getElementById('book-description');
    const priceInput = document.getElementById('book-price');
    const bookImageInput = document.getElementById('bookImage');

    // Modal Elements
    const reviewBookTitle = document.getElementById('reviewBookTitle');
    const reviewAuthor = document.getElementById('reviewAuthor');
    const reviewGenre = document.getElementById('reviewGenre');
    const reviewCondition = document.getElementById('reviewCondition');
    const reviewDescription = document.getElementById('reviewDescription');
    const reviewPrice = document.getElementById('reviewPrice');
    const reviewBookImage = document.getElementById('reviewBookImage');

    // Add Listing Button
    const addListingBtn = document.getElementById('openReviewModalBtn');

    // Validation Modal
    const validationModal = new bootstrap.Modal(document.getElementById('validationModal'));

    // Function to check if all required fields are filled
    function isFormComplete() {
        return (
            bookTitleInput.value.trim() !== '' &&
            authorInput.value.trim() !== '' &&
            genreInput.value !== '' &&
            conditionInput.value !== '' &&
            descriptionInput.value.trim() !== '' &&
            priceInput.value.trim() !== ''
        );
    }

    // Function to display image preview when selected
    bookImageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                document.getElementById('profilePreview').src = reader.result;
            };
            reader.readAsDataURL(file);
        }
    });

    // When the "Add Listing" button is clicked
    addListingBtn.addEventListener('click', (e) => {
        e.preventDefault(); // Prevent form submission for now

        if (isFormComplete()) {
            // Populate the modal with form data
            reviewBookTitle.textContent = bookTitleInput.value;
            reviewAuthor.textContent = authorInput.value;
            reviewGenre.textContent = genreInput.value;
            reviewCondition.textContent = conditionInput.value;
            reviewDescription.textContent = descriptionInput.value;
            reviewPrice.textContent = `₱${parseFloat(priceInput.value).toFixed(2)}`;

            // Handle Image Preview
            const file = bookImageInput.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    reviewBookImage.src = e.target.result;
                };
                reader.readAsDataURL(file);
            } else {
                reviewBookImage.src = 'images/default-avatar.png'; // Reset to default if no image is selected
            }

            // Show the review modal
            const modal = new bootstrap.Modal(document.getElementById('formReviewModal'));
            modal.show();
        } else {
            // Show the validation modal if the form is incomplete
            validationModal.show();
        }
    });

// Function to check how many books a user has listed this month
async function getMonthlyListingsCount(userId) {
    const currentMonth = new Date().toISOString().slice(0, 7); // Format: YYYY-MM
    const listingsRef = ref(database, `book-listings`);
    const snapshot = await get(listingsRef);

    if (!snapshot.exists()) return 0;

    const listings = snapshot.val();
    let count = 0;

    for (const key in listings) {
        const listing = listings[key];
        if (
            listing.userId === userId &&
            listing.dateListed.startsWith(currentMonth) // Check if listed in the current month
        ) {
            count++;
        }
    }

    return count;
}

// Modified "Confirm Submission" button handler
document.getElementById('confirmSubmissionBtn').addEventListener('click', async () => {
    try {
        const user = await checkAuth();
        const userId = user.uid; // Get the logged-in user's ID

        // Check subscription status
        const subscriptionRef = ref(database, `subscription/${userId}`);
        const subscriptionSnapshot = await get(subscriptionRef);
        let isSubscribed = false;

        if (subscriptionSnapshot.exists()) {
            const { subStatus } = subscriptionSnapshot.val();
            isSubscribed = subStatus === 'subscribed';
        }

        // Get the current number of monthly listings
        const monthlyListingsCount = await getMonthlyListingsCount(userId);

        // Enforce limit for non-subscribed users
        if (!isSubscribed && monthlyListingsCount >= 1) {
            alert('You are limited to 1 book listing per month as a non-subscribed user. Subscribe to list more.');
            return;
        }

        // Upload the image to Firebase Storage
        const file = bookImageInput.files[0];
        let imageUrl = '';

        if (file) {
            const imageStorageRef = storageRef(storage, `book-images/${Date.now()}-${file.name}`);
            await uploadBytes(imageStorageRef, file);
            imageUrl = await getDownloadURL(imageStorageRef);
        }

        // Create the data object with user ID and date-listed
        const bookData = {
            title: bookTitleInput.value,
            author: authorInput.value,
            genre: genreInput.value,
            condition: conditionInput.value,
            description: descriptionInput.value,
            price: parseFloat(priceInput.value).toFixed(2),
            imageUrl: imageUrl,
            userId: userId, // Associate the book with the logged-in user
            dateListed: new Date().toISOString(), // Add the current date and time
            bookStatus: "pending"
        };

        // Save the data to Firebase Realtime Database
        const newBookRef = ref(database, `book-listings/${Date.now()}`);
        await set(newBookRef, bookData);

        // Assign "seller" role to the user after adding the book
        await updateUserRole(userId);

        console.log('Book listing added successfully!');

        // Reset the form
        bookTitleInput.value = '';
        authorInput.value = '';
        genreInput.value = '';
        conditionInput.value = '';
        descriptionInput.value = '';
        priceInput.value = '';
        bookImageInput.value = '';
        reviewBookImage.src = 'images/default-avatar.png'; // Reset image preview

        // Close the modal
        const modalInstance = bootstrap.Modal.getInstance(document.getElementById('formReviewModal'));
        modalInstance.hide();
    } catch (error) {
        console.error('Error adding book listing:', error);
        alert('Failed to add the book listing. Please try again.');
    }
});

    
});

// Function to assign the "seller" role to a user
async function updateUserRole(userId) {
    const userRef = ref(database, `users/${userId}`);
    await update(userRef, {
        role: 'seller'
    });
}