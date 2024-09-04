import { checkAuth } from './auth.js';
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";
import { initializeNavbar } from './navbar.js';

const database = getDatabase();

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
    initializeNavbar();
    updateUserProfile();
});
