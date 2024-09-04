import { checkAuth } from './auth.js';
import { initializeNavbar } from './navbar.js';
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js";


const database = getDatabase();
const storage = getStorage();

document.addEventListener('DOMContentLoaded', initializeNavbar);

document.addEventListener('DOMContentLoaded', () => {
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

    // Function to display profile picture preview when selected
    bookImageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                // Update the profile preview image with the selected image
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

    // Handle "Continue" button in the modal
    document.getElementById('confirmSubmissionBtn').addEventListener('click', async () => {
        try {
            // Check if a user is logged in using the checkAuth function
            const user = await checkAuth();
            if (user) {
                const userId = user.uid; // Get the logged-in user's ID
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
                    dateListed: new Date().toISOString() // Add the current date and time
                };

                // Save the data to Firebase Realtime Database
                const newBookRef = ref(database, `book-listings/${Date.now()}`);
                await set(newBookRef, bookData);

                // Optionally, show a success message here
                alert('Book listing added successfully!');

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
            } else {
                alert('You must be logged in to add a listing.');
            }
        } catch (error) {
            console.error('Error adding book listing:', error);
            alert('Failed to add the book listing. Please try again.');
        }
    });
});
