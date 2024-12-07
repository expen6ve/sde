import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getDatabase, ref, get, update } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyCN8NcVQNRjAF_A86a8NfxC9Audivokuso",
    authDomain: "sde-ecoread.firebaseapp.com",
    databaseURL: "https://sde-ecoread-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "sde-ecoread",
    storageBucket: "sde-ecoread.appspot.com",
    messagingSenderId: "137637739158",
    appId: "1:137637739158:web:c9b885cf9025c89e2c60b7"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

window.addEventListener('DOMContentLoaded', () => {
    const userTable = document.getElementById('userTable');

    if (userTable) {
        const table = new simpleDatatables.DataTable(userTable);

        const usersRef = ref(database, 'users');
        get(usersRef).then(snapshot => {
            if (snapshot.exists()) {
                const users = snapshot.val();
                console.log(users);  // Verify the structure of users in the console

                const rows = [];
                for (const key in users) {
                    const user = users[key];

                    // Check for missing data
                    console.log(user.firstName, user.dateCreated, user.role);  // Debug log

                    // Skip users with role "admin"
                    if (user.role === "admin") {
                        continue;
                    }

                    // Format dateCreated to a human-readable format
                    const formattedDate = new Date(user.dateCreated).toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric"
                    });

                    rows.push([ 
                        user.firstName, 
                        formattedDate,
                        user.role,
                        ` 
                            <span class="status text-${user.verifyStatus === 'verified' ? 'success' : user.verifyStatus === 'pending' ? 'warning' : 'danger'} mt-0 mb-1">
                                &bull;
                            </span> 
                            ${user.verifyStatus}
                            <a href="#" class="verify-status-btn" data-id="${key}" data-status="verify-approved" title="Approve">
                                <i class="material-icons check-icon">check_circle</i>
                            </a>
                        `,
                        ` 
                            <span class="status text-${user.subStatus === 'subscribed' ? 'success' : user.subStatus === 'pending' ? 'warning' : 'danger'} mt-0 mb-1">
                                &bull;
                            </span> 
                            ${user.subStatus}
                            <a href="#" class="subscribe-status-btn" data-id="${key}" data-status="subscribe-approved" title="Approve">
                                <i class="material-icons check-icon">check_circle</i>
                            </a>
                        `,
                        `<a href="#" class="settings" title="Settings"><i class="material-icons">&#xE8B8;</i></a>
                         <a href="#" class="delete" title="Delete"><i class="material-icons">&#xE5C9;</i></a>`
                    ]);
                }

                // Add the rows after DataTable is initialized
                table.rows().add(rows).draw();
            } else {
                console.log("No data available");
            }
        }).catch((error) => {
            console.error("Error getting data: ", error);
        });
    }
});

// Event delegation for verify-status-btn clicks
document.addEventListener('DOMContentLoaded', () => {
    const userTable = document.getElementById('userTable');
    if (userTable) {
        userTable.addEventListener('click', function(event) {
            const button = event.target.closest('.verify-status-btn');
            if (button) {
                event.preventDefault(); // Prevent default anchor action

                const userId = button.getAttribute('data-id');

                // Create references to both the user and verification nodes
                const verificationRef = ref(database, `verificationtoconfirm/${userId}`);
                const userRef = ref(database, `users/${userId}`);

                // Fetch user data from the "users" node
                get(userRef).then(userSnapshot => {
                    if (userSnapshot.exists()) {
                        const userData = userSnapshot.val();

                        // Check if user is already verified
                        if (userData.verifyStatus === 'verified') {
                            // Disable the approve button and show an alert
                            const submitButton = document.getElementById('submitButton');
                            submitButton.disabled = true;
                            alert("This user is already verified.");
                        } else {
                            // Enable the approve button if the user is not verified
                            const submitButton = document.getElementById('submitButton');
                            submitButton.disabled = false;
                        }

                        // Fetch verification data from the "verificationtoconfirm" node
                        get(verificationRef).then(snapshot => {
                            if (snapshot.exists()) {
                                const verificationData = snapshot.val();

                                // Update the modal with verification data
                                document.getElementById('idImagePreview').src = verificationData.idFileUrl;
                                document.getElementById('selfieImagePreview').src = verificationData.selfieFileUrl;
                                document.getElementById('idType').textContent = verificationData.idType;
                                document.getElementById('idNumber').textContent = verificationData.idNumber;
                                document.getElementById('fullName').textContent = verificationData.fullName;
                                document.getElementById('fullAddress').textContent = verificationData.fullAddress;
                                document.getElementById('dob').textContent = verificationData.dob;

                                // Show the modal
                                const userVerifyDetailsModal = new bootstrap.Modal(document.getElementById('userVerifyDetailsModal'));
                                userVerifyDetailsModal.show();

                                // Handle the "Approve" button click
                                document.getElementById('submitButton').addEventListener('click', function() {
                                    if (submitButton.disabled) return; // Prevent further clicks if button is disabled

                                    const updates = {
                                        verifyStatus: 'verified', // Set status to 'verified'
                                    };

                                    // Update the "users" node with the 'verified' status
                                    update(userRef, updates).then(() => {
                                        console.log(`User ${userId} verified successfully!`);

                                        // Optionally, you can update the "verificationtoconfirm" node as well
                                        update(verificationRef, { verifyStatus: 'verified' }).then(() => {
                                            console.log(`Verification status for user ${userId} updated successfully.`);
                                        }).catch(error => {
                                            console.error('Error updating verification status in verificationtoconfirm:', error);
                                        });

                                        // Close the modal
                                        userVerifyDetailsModal.hide();
                                    }).catch(error => {
                                        console.error('Error updating user verify status:', error);
                                    });
                                });

                                // Handle the "Reject" button click
                                document.getElementById('rejectButton').addEventListener('click', function() {
                                    // Retrieve the rejection message
                                    const rejectionMessage = document.getElementById('verificationNotes').value;

                                    // Check if the rejection message is provided
                                    if (rejectionMessage.trim() !== "") {
                                        const updates = {
                                            verifyStatus: 'denied', // Set status to 'denied'
                                            rejectionMessage: rejectionMessage, // Add rejection message
                                        };

                                        // Update both the "users" node and the "verificationtoconfirm" node with the rejection data
                                        update(userRef, { verifyStatus: 'denied' }).then(() => {
                                            console.log(`User ${userId} rejected successfully!`);

                                            // Update the "verificationtoconfirm" node with the rejection message
                                            update(verificationRef, updates).then(() => {
                                                console.log(`Rejection details updated for user ${userId}.`);
                                            }).catch(error => {
                                                console.error('Error updating rejection details in verificationtoconfirm:', error);
                                            });

                                            // Close the modal
                                            userVerifyDetailsModal.hide();
                                        }).catch(error => {
                                            console.error('Error updating user verify status:', error);
                                        });
                                    } else {
                                        alert("Please provide a reason for rejection.");
                                    }
                                });
                            } else {
                                console.log('No verification data found for user.');
                            }
                        }).catch((error) => {
                            console.error("Error fetching verification data:", error);
                        });
                    }
                }).catch((error) => {
                    console.error("Error fetching user data:", error);
                });
            }
        });
    }
});



$(document).ready(function(){
    $('[data-toggle="tooltip"]').tooltip();
});
