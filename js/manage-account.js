import { checkAuth } from './auth.js';
import { getDatabase, ref, get, update } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js";
import { initializeNavbar } from './navbar.js';

const database = getDatabase();
const storage = getStorage();
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Utility functions
const capitalize = str => str.charAt(0).toUpperCase() + str.slice(1);
const capitalizeWords = str => str.split(' ').map(capitalize).join(' ');

const getElementValue = id => document.getElementById(id).value.trim();
const setElementText = (id, text) => document.getElementById(id).textContent = text || 'Not provided';
const setImageSrc = (id, src) => document.getElementById(id).src = src || '';

async function fetchUserData() {
    const user = await checkAuth();
    if (!user) return null;

    const userRef = ref(database, 'users/' + user.uid);
    const snapshot = await get(userRef);
    return snapshot.exists() ? snapshot.val() : null;
}

function updateDOMUserProfile(userData) {
    setElementText('userFullName', `${userData.firstName} ${userData.lastName}`);
    setImageSrc('userProfilePic', userData.profilePicture);
    setElementText('userGender', capitalize(userData.gender));
    
    const { birthDate, address, phone } = userData;
    setElementText('userBirthDate', birthDate ? `${months[birthDate.dateMonth - 1]} ${birthDate.dateDay}, ${birthDate.dateYear}` : '');
    setElementText('userAddress', address ? capitalizeWords(`${address.street}, ${address.barangay}, ${address.city}`) : '');
    setElementText('userPhoneNumber', phone ? `+63 ${phone}` : '');
}

async function updateUserProfile() {
    const userData = await fetchUserData();
    if (userData) updateDOMUserProfile(userData);
}

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

// Update recent listings in the DOM
async function updateUserRecentListings() {
    const user = await checkAuth();
    if (!user) return;

    const listingsRef = ref(database, 'book-listings');
    const snapshot = await get(listingsRef);
    const userRecentListingElement = document.getElementById('userRecentListing');
    userRecentListingElement.innerHTML = '';  // Clear existing content

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

// Handle profile update
document.getElementById('saveProfileChangesButton').addEventListener('click', async () => {
    const user = await checkAuth();
    if (!user) return;

    const currentUserData = await fetchUserData();
    const updatedProfileData = {};

    // Update non-empty fields
    const updateIfFilled = (field, value) => value ? updatedProfileData[field] = value : null;

    updateIfFilled('firstName', getElementValue('editFirstName'));
    updateIfFilled('lastName', getElementValue('editLastName'));
    updateIfFilled('gender', getElementValue('editGender'));
    updateIfFilled('phone', getElementValue('editPhoneNumber'));

    const addressFields = ['editStreet', 'editBarangay', 'editCity', 'editProvince', 'editZipCode'];
    const updatedAddress = {};
    addressFields.forEach(field => {
        const value = getElementValue(field);
        if (value) updatedAddress[field.replace('edit', '').toLowerCase()] = value;
    });
    
    if (Object.keys(updatedAddress).length) {
        updatedProfileData.address = { ...currentUserData.address, ...updatedAddress };
    }

    const [dateDay, dateMonth, dateYear] = ['user-day', 'user-month', 'user-year'].map(getElementValue);
    if (dateDay && dateMonth && dateYear) {
        updatedProfileData.birthDate = { dateDay, dateMonth, dateYear };
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
