import { checkAuth } from './auth.js';
import { initializeNavbar } from './navbar.js';
import { getAuth, updatePassword, EmailAuthProvider, reauthenticateWithCredential, verifyBeforeUpdateEmail } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getDatabase, ref, get, update } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";

const auth = getAuth();
const db = getDatabase();

// Initialize Navbar and Authentication
document.addEventListener('DOMContentLoaded', async () => {
    let currentUser = await checkAuth();

    // Hide the Sign In button if the user is authenticated
    const signInButton = document.getElementById('signinbutton');
    if (currentUser) {
        signInButton.style.display = 'none'; // User is authenticated, hide the button
    } else {
        signInButton.style.display = 'block'; // User is not authenticated, show the button
    }

    initializeNavbar(); // Initialize navbar as usual
});

document.getElementById('savePassEmail').addEventListener('click', function () {
    const newEmail = document.getElementById('newEmail').value;
    const confirmEmail = document.getElementById('confirmEmail').value;

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Validate if new email and confirm email match
    if (newEmail && newEmail !== confirmEmail) {
        alert("New email and confirmation email do not match.");
        return;
    }

    // Ensure that the new email is not the same as the current email
    if (newEmail && newEmail === auth.currentUser.email) {
        alert("The new email cannot be the same as the current email.");
        return;
    }

    // Validate password fields if password is being updated
    if (newPassword && newPassword !== confirmPassword) {
        alert("New password and confirmation password do not match.");
        return;
    }

    if (newPassword && newPassword === currentPassword) {
        alert("The new password cannot be the same as the current password.");
        return;
    }

    // Get the current user
    const user = auth.currentUser;
    if (user) {
        // Retrieve the user's data from the database using their UID
        const userRef = ref(db, 'users/' + user.uid);
        get(userRef)
            .then((snapshot) => {
                if (snapshot.exists()) {
                    const userData = snapshot.val();
                    const databasePassword = userData.password;  // Retrieve the password from the database

                    // Check if the password exists in the database
                    if (!databasePassword) {
                        alert("Password not found in the database.");
                        return;
                    }

                    // Reauthenticate the user using the current email and password
                    const credential = EmailAuthProvider.credential(auth.currentUser.email, databasePassword);
                    reauthenticateWithCredential(user, credential)
                        .then(() => {
                            // If new password is provided, update password
                            if (newPassword) {
                                updatePassword(user, newPassword)
                                    .then(() => {
                                        // After password is updated, save it in the database
                                        update(userRef, {
                                            password: newPassword // Update the password in the database
                                        }).then(() => {
                                            console.log("User password updated in the database.");
                                        }).catch((error) => {
                                            alert("Error updating password in the database: " + error.message);
                                        });
                                    })
                                    .catch((error) => {
                                        alert("Error updating password: " + error.message);
                                    });
                            }

                            // If new email is provided, verify and update email
                            if (newEmail) {
                                verifyBeforeUpdateEmail(user, newEmail)
                                    .then(() => {
                                        alert("A verification email has been sent to your new email. Please verify to complete the change.");

                                        // After email verification, update the email in the database
                                        update(userRef, {
                                            email: newEmail // Update the email field in the database
                                        }).then(() => {
                                            console.log("User email updated in the database.");
                                        }).catch((error) => {
                                            alert("Error updating email in the database: " + error.message);
                                        });

                                        // Optional: Provide user guidance to re-login after email verification
                                        alert("Please verify your new email. After verifying, log in again using your new email.");
                                    })
                                    .catch((error) => {
                                        alert("Error verifying email: " + error.message);
                                    });
                            }
                        })
                        .catch((error) => {
                            alert("Error reauthenticating user: " + error.message);
                        });
                } else {
                    alert("User data not found in the database.");
                }
            })
            .catch((error) => {
                alert("Error fetching user data from database: " + error.message);
            });
    } else {
        alert("No user is logged in.");
    }
});
