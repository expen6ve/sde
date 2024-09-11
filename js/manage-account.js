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

// Function to fetch and display the most recent listing of the logged-in user
function updateUserRecentListings() {
    checkAuth().then((user) => {
        if (user) {
            const userId = user.uid;
            const listingsRef = ref(database, 'book-listings');

            get(listingsRef).then((snapshot) => {
                if (snapshot.exists()) {
                    const allListings = snapshot.val();
                    const userRecentListingElement = document.getElementById('userRecentListing');
                    
                    userRecentListingElement.innerHTML = ''; // Clear existing content

                    // Filter, sort, and get the most recent listing
                    const userListings = Object.keys(allListings)
                        .filter(key => allListings[key].userId === userId)
                        .map(key => ({ id: key, ...allListings[key] }))
                        .sort((a, b) => new Date(b.dateListed) - new Date(a.dateListed));

                    if (userListings.length > 0) {
                        const mostRecentBook = userListings[0];
                        const bookCard = `
                            <div class="card h-100">
                                <div class="card-body">
                                    <div class="d-flex justify-content-center">
                                        <img src="${mostRecentBook.imageUrl || 'images/default-book.png'}" class="img-fluid" alt="Book Image" style="height: 200px; object-fit: cover;">
                                    </div>
                                    <h4 class="card-title mt-3 fs-5">${mostRecentBook.title}</h4>
                                    <p class="card-text mb-0 user-info-font"><strong>Author:</strong> ${mostRecentBook.author}</p>
                                    <p class="card-text mb-0 user-info-font"><strong>Condition:</strong> ${mostRecentBook.condition}</p>
                                    <p class="card-text mb-0 user-info-font"><strong>Price:</strong> ₱${mostRecentBook.price}</p>
                                </div>
                            </div>
                        `;
                        userRecentListingElement.innerHTML = bookCard;
                    } else {
                        userRecentListingElement.innerHTML = '<p>No recent listings available.</p>';
                    }
                } else {
                    userRecentListingElement.innerHTML = '<p>No listings available.</p>';
                }
            }).catch((error) => {
                console.error("Error fetching listings: ", error);
            });
        } else {
            console.log("User not authenticated");
        }
    });
}




// Initialize Navbar, update user profile, and recent listings on DOM content loaded
document.addEventListener('DOMContentLoaded', () => {
    checkAuth().then((user) => {
        if (user) {
            // If user is authenticated, initialize the page
            initializeNavbar();
            updateUserProfile();
            updateUserRecentListings(); // Fetch and display recent listings
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

