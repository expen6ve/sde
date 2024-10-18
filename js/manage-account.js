import { checkAuth } from './auth.js';
import { getDatabase, ref, get, update } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js";
import { initializeNavbar } from './navbar.js';

const database = getDatabase();
const storage = getStorage();

const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const capitalize = str => str.charAt(0).toUpperCase() + str.slice(1);
const capitalizeWords = str => str.split(' ').map(capitalize).join(' ');

// Update user profile information in the DOM
async function updateUserProfile() {
    const user = await checkAuth();
    if (!user) return;

    const userRef = ref(database, 'users/' + user.uid);
    const snapshot = await get(userRef);

    if (snapshot.exists()) {
        const userData = snapshot.val();
        document.getElementById('userFullName').textContent = `${userData.firstName} ${userData.lastName}`;
        document.getElementById('userProfilePic').src = userData.profilePicture || '';
        document.getElementById('userGender').textContent = capitalize(userData.gender || 'Not provided');
        
        const { birthDate, address, phone } = userData;
        document.getElementById('userBirthDate').textContent = birthDate 
            ? `${months[birthDate.dateMonth - 1]} ${birthDate.dateDay}, ${birthDate.dateYear}`
            : 'Not provided';
        
        document.getElementById('userAddress').textContent = address 
            ? capitalizeWords(`${address.street}, ${address.barangay}, ${address.city}`)
            : 'Not provided';

        document.getElementById('userPhoneNumber').textContent = phone ? `+63 ${phone}` : 'Not provided';
    }
}

// Update profile in the Firebase Database
async function updateProfileInFirebase(user, updatedProfileData, profileImageFile) {
    const userRef = ref(database, `users/${user.uid}`);
    
    if (profileImageFile) {
        const profileImageRef = storageRef(storage, `profilePictures/${user.uid}`);
        const snapshot = await uploadBytes(profileImageRef, profileImageFile);
        updatedProfileData.profilePicture = await getDownloadURL(snapshot.ref);
    }

    await update(userRef, updatedProfileData);
}

// Fetch and display recent listings of the logged-in user
async function updateUserRecentListings() {
    const user = await checkAuth();
    if (!user) return;

    const listingsRef = ref(database, 'book-listings');
    const snapshot = await get(listingsRef);
    const userRecentListingElement = document.getElementById('userRecentListing');
    userRecentListingElement.innerHTML = ''; // Clear existing content

    if (snapshot.exists()) {
        const allListings = snapshot.val();
        const userListings = Object.keys(allListings)
            .filter(key => allListings[key].userId === user.uid)
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
                </div>`;
        } else {
            userRecentListingElement.innerHTML = '<p>No recent listings available.</p>';
        }
    }
}

// Handle profile update on button click
document.getElementById('saveProfileChangesButton').addEventListener('click', async () => {
    const user = await checkAuth();
    if (!user) return;

    const updatedProfileData = {
        firstName: document.getElementById('editFirstName').value,
        lastName: document.getElementById('editLastName').value,
        gender: document.getElementById('editGender').value,
        phone: document.getElementById('editPhoneNumber').value,
        address: {
            street: document.getElementById('editStreet').value,
            barangay: document.getElementById('editBarangay').value,
            city: document.getElementById('editCity').value,
            province: document.getElementById('editProvince').value,
            zipCode: document.getElementById('editZipCode').value,
        }
    };

    const profileImageFile = document.getElementById('profilePicture').files[0];

    try {
        await updateProfileInFirebase(user, updatedProfileData, profileImageFile);
        alert("Profile updated successfully!");
        updateUserProfile();
        // Close the modal after saving
        const modal = bootstrap.Modal.getInstance(document.getElementById('editProfileModal'));
        modal.hide();
    } catch (error) {
        console.error("Error updating profile: ", error);
        alert("Failed to update profile. Please try again.");
    }
});

// Preview selected image
document.getElementById('profilePicture').addEventListener('change', function() {
    const file = this.files[0];
    const previewElement = document.getElementById('profilePicturePreview');

    if (file) {
        const reader = new FileReader();
        reader.onload = e => { previewElement.src = e.target.result; };
        reader.readAsDataURL(file);
    }
});

// Initialize Navbar and user data on DOM content loaded
document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkAuth();
    if (user) {
        initializeNavbar();
        await updateUserProfile();
        await updateUserRecentListings();
    } else {
        window.location.href = '/index.html';
    }
});
