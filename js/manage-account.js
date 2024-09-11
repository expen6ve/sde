import { checkAuth } from './auth.js';
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";
import { initializeNavbar } from './navbar.js';

const database = getDatabase();

function getMonthName(monthNumber) {
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[monthNumber - 1];
}

function capitalizeFirstLetter(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function capitalizeWords(str) {
    return str.split(' ').map(word => capitalizeFirstLetter(word)).join(' ');
}

// Function to update the user's profile information
function updateUserProfile() {
    checkAuth().then((user) => {
        if (user) {
            const userRef = ref(database, 'users/' + user.uid);

            get(userRef).then((snapshot) => {
                if (snapshot.exists()) {
                    const userData = snapshot.val();
                    const fullName = `${userData.firstName} ${userData.lastName}`;
                    const profilePicture = userData.profilePicture;

                    // Update the user's full name in the DOM
                    const userFullNameElement = document.getElementById('userFullName');
                    userFullNameElement.textContent = fullName;

                    // Update the user's profile picture in the DOM
                    const profilePictureElement = document.getElementById('userProfilePic');
                    if (profilePicture) {
                        profilePictureElement.src = profilePicture;
                    } else {
                        console.log("Profile picture URL is empty");
                    }

                    // Update the user's gender in the DOM
                    const userGenderElement = document.getElementById('userGender');
                    userGenderElement.textContent = capitalizeFirstLetter(userData.gender) || 'Not provided';

                    // Update the user's birth date in the DOM
                    const birthDate = userData.birthDate;
                    const userBirthDateElement = document.getElementById('userBirthDate');
                    if (birthDate) {
                        const monthName = getMonthName(birthDate.dateMonth);
                        userBirthDateElement.textContent = `${monthName} ${birthDate.dateDay}, ${birthDate.dateYear}`;
                    } else {
                        userBirthDateElement.textContent = 'Not provided';
                    }

                    // Update the user's address in the DOM
                    const address = userData.address;
                    const userAddressElement = document.getElementById('userAddress');
                    if (address) {
                        // Capitalize each part of the address
                        const formattedAddress = capitalizeWords(`${address.street}, ${address.barangay}, ${address.city}`);
                        userAddressElement.textContent = formattedAddress;
                    } else {
                        userAddressElement.textContent = 'Not provided';
                    }

                    // Update the user's phone number in the DOM
                    const userPhoneNumberElement = document.getElementById('userPhoneNumber');
                    userPhoneNumberElement.textContent = "+63 " + (userData.phone || 'Not provided');
                    
                } else {
                    console.log("No data available");
                }
            }).catch((error) => {
                console.error("Error fetching user data: ", error);
            });
        } else {
            console.log("User not authenticated");
        }
    });
}

// Initialize Navbar and update user profile on DOM content loaded
document.addEventListener('DOMContentLoaded', () => {
    checkAuth().then((user) => {
        if (user) {
            // If user is authenticated, initialize the page
            initializeNavbar();
            updateUserProfile();
        } else {
            // If user is not authenticated, redirect to login page
            window.location.href = '/login.html';  // Change '/login.html' to your actual login page
        }
    }).catch((error) => {
        console.error("Error checking authentication: ", error);
        // Optionally redirect to login in case of any error
        window.location.href = '/login.html';
    });
});
