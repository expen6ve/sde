import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getDatabase, ref, get, update, remove } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";

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
                        `<a href="#" class="settingsUser" data-id="${key}" title="Settings"><i class="material-icons">&#xE8B8;</i></a>
                         <a href="#" class="deleteUser" data-id="${key}" title="Delete"><i class="material-icons">&#xE5C9;</i></a>`
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
document.addEventListener('DOMContentLoaded', () => {
    const userTable = document.getElementById('userTable');
    if (userTable) {
        userTable.addEventListener('click', function(event) {
            const button = event.target.closest('.subscribe-status-btn');
            if (button) {
                event.preventDefault(); // Prevent default anchor action

                const userId = button.getAttribute('data-id');

                // Create references to both the user and subscription nodes
                const subscriptionRef = ref(database, `subscription/${userId}`);
                const userRef = ref(database, `users/${userId}`);

                // Fetch subscription data from the "subscription" node
                get(subscriptionRef).then(snapshot => {
                    if (snapshot.exists()) {
                        const subscriptionData = snapshot.val();

                        // Update the modal with subscription data
                        document.getElementById('imageUrlPreview').src = subscriptionData.imageUrl;
                        document.getElementById('transactionReference').textContent = subscriptionData.transactionRef;

                        // Show the modal
                        const userSubscribeDetailsModal = new bootstrap.Modal(document.getElementById('userSubscribeDetailsModal'));
                        userSubscribeDetailsModal.show();

                        // Handle the "Approve" button click
                        document.getElementById('subApproveButton').addEventListener('click', function() {
                            const updates = {
                                subStatus: 'subscribed', // Set status to 'subscribed'
                            };

                            // Update the "users" node with the 'subscribed' status
                            update(userRef, updates).then(() => {
                                console.log(`User ${userId} subscribed successfully!`);

                                // Optionally, you can update the "subscription" node as well
                                update(subscriptionRef, { subStatus: 'subscribed' }).then(() => {
                                    console.log(`Subscription status for user ${userId} updated successfully.`);
                                }).catch(error => {
                                    console.error('Error updating subscription status in subscription:', error);
                                });

                                // Close the modal
                                userSubscribeDetailsModal.hide();
                            }).catch(error => {
                                console.error('Error updating user subscription status:', error);
                            });
                        });

                        // Handle the "Reject" button click
                        document.getElementById('subRejectButton').addEventListener('click', function() {
                            const rejectionMessage = document.getElementById('subscriptionNotes').value.trim();

                            // Check if a rejection message is provided
                            if (rejectionMessage !== "") {
                                const updates = {
                                    subStatus: 'denied',  // Set status to 'denied'
                                    rejectionMessage: rejectionMessage, // Save rejection reason
                                };

                                // Update the "users" node with the 'denied' status
                                update(userRef, { subStatus: 'denied' }).then(() => {
                                    console.log(`User ${userId} subscription rejected.`);

                                    // Optionally, you can update the "subscription" node with the rejection reason
                                    update(subscriptionRef, updates).then(() => {
                                        console.log(`Rejection details saved for user ${userId}.`);
                                    }).catch(error => {
                                        console.error('Error updating rejection details in subscription:', error);
                                    });

                                    // Close the modal
                                    userSubscribeDetailsModal.hide();
                                }).catch(error => {
                                    console.error('Error updating user subscription status:', error);
                                });
                            } else {
                                alert("Please provide a reason for rejection.");
                            }
                        });
                    } else {
                        console.log('No subscription data found for user.');
                    }
                }).catch((error) => {
                    console.error("Error fetching subscription data:", error);
                });
            }
        });
    }
});
document.addEventListener('DOMContentLoaded', () => {
    const userTable = document.getElementById('userTable');

    if (userTable) {
        userTable.addEventListener('click', function(event) {
            const button = event.target.closest('.deleteUser');
            if (button) {
                event.preventDefault(); // Prevent default anchor action

                const userId = button.getAttribute('data-id');  // Get the user ID from the data attribute
                const userRow = button.closest('tr');  // Get the row of the user being deleted

                // Show the confirmation modal
                const deleteUserModal = new bootstrap.Modal(document.getElementById('deleteUserModal'));
                deleteUserModal.show();

                // Handle the "Yes, Delete" button click
                document.getElementById('confirmDeleteButton').addEventListener('click', function() {
                    // Get references to the user and all related data
                    const userRef = ref(database, `users/${userId}`);
                    const subscriptionRef = ref(database, `subscription/${userId}`);
                    const verificationRef = ref(database, `verificationtoconfirm/${userId}`);
                    const bookListingsRef = ref(database, `book-listings`); // Reference to the book listings node

                    // Fetch all book listings to find books by this user
                    get(bookListingsRef).then(snapshot => {
                        if (snapshot.exists()) {
                            const bookListings = snapshot.val();
                            const deletePromises = [];

                            // Loop through the book listings and check for userId match
                            for (const bookKey in bookListings) {
                                if (bookListings[bookKey].userId === userId) {
                                    const bookRef = ref(database, `book-listings/${bookKey}`);
                                    deletePromises.push(remove(bookRef)); // Add delete promise to array
                                }
                            }

                            // Wait for all book deletions to complete
                            Promise.all(deletePromises)
                                .then(() => {
                                    // Proceed with deleting the user and other related data
                                    return Promise.all([
                                        remove(userRef),
                                        remove(subscriptionRef),
                                        remove(verificationRef)
                                    ]);
                                })
                                .then(() => {
                                    console.log(`User ${userId} and all related data, including book listings, have been deleted successfully.`);

                                    // Remove the row from the table
                                    if (userRow) {
                                        userRow.remove();
                                    }

                                    // Close the modal
                                    deleteUserModal.hide();

                                    // Optionally, refresh the user table or update UI
                                    alert("User and their listings deleted successfully.");
                                })
                                .catch((error) => {
                                    console.error('Error deleting user data or books:', error);
                                    alert("Error deleting user or their listings. Please try again.");
                                });
                        } else {
                            console.log('No book listings found for user.');
                            // Proceed with deleting the user if no books are found
                            return Promise.all([
                                remove(userRef),
                                remove(subscriptionRef),
                                remove(verificationRef)
                            ]);
                        }
                    }).catch((error) => {
                        console.error("Error fetching book listings:", error);
                        alert("Error fetching book listings. Please try again.");
                    });
                });
            }
        });
    }
});
document.addEventListener('click', (event) => {
    if (event.target.closest('.settingsUser')) {
        const userId = event.target.closest('.settingsUser').getAttribute('data-id');
        const userRef = ref(database, `users/${userId}`);

        get(userRef).then(snapshot => {
            if (snapshot.exists()) {
                const user = snapshot.val();

                // Open the userDetailsModal
                const userDetailsModalElement = document.getElementById('userDetailsModal');
                const userDetailsModal = new bootstrap.Modal(userDetailsModalElement);
                
                // Close the userDetailsModal if it's already open
                const existingUserDetailsModal = bootstrap.Modal.getInstance(userDetailsModalElement);
                if (existingUserDetailsModal) {
                    existingUserDetailsModal.hide();
                }

                userDetailsModal.show();

                // Cleanup when the userDetailsModal is hidden
                userDetailsModalElement.addEventListener('hidden.bs.modal', () => {
                    // Reset modal content to avoid lingering data
                    userDetailsModalElement.querySelector('#userBasicDetailsBtn').removeEventListener('click', showUserBasicDetails);
                    userDetailsModalElement.querySelector('#userAddressBtn').removeEventListener('click', showUserAddressDetails);
                });

                // Show basic user details in the modal
                const showUserBasicDetails = () => {
                    document.getElementById('profilePicture').src = user.profilePicture;
                    document.getElementById('email').value = user.email;
                    document.getElementById('password').value = user.password;
                    document.getElementById('firstName').value = user.firstName;
                    document.getElementById('lastName').value = user.lastName;
                    document.getElementById('age').value = user.age;
                    document.getElementById('gender').value = user.gender;
                    document.getElementById('birthDay').value = user.birthDate.day;
                    document.getElementById('birthMonth').value = user.birthDate.month;
                    document.getElementById('birthYear').value = user.birthDate.year;

                    const userBasicDetailsModal = new bootstrap.Modal(document.getElementById('userBasicDetailsModal'));
                    userBasicDetailsModal.show();
                };

                document.getElementById('userBasicDetailsBtn').addEventListener('click', showUserBasicDetails);

                // Handle the Edit button
                document.getElementById('basicEditButton').addEventListener('click', () => {
                    // Enable the input fields for editing
                    document.getElementById('email').disabled = false;
                    document.getElementById('password').disabled = false;
                    document.getElementById('firstName').disabled = false;
                    document.getElementById('lastName').disabled = false;
                    document.getElementById('age').disabled = false;
                    document.getElementById('gender').disabled = false;
                    document.getElementById('birthDay').disabled = false;
                    document.getElementById('birthMonth').disabled = false;
                    document.getElementById('birthYear').disabled = false;

                    // Enable Save button
                    document.getElementById('basicSaveButton').disabled = false;
                });

                // Handle the Save button
                document.getElementById('basicSaveButton').addEventListener('click', () => {
                    // Retrieve updated values from the form
                    const updatedUser = {
                        email: document.getElementById('email').value,
                        password: document.getElementById('password').value,
                        firstName: document.getElementById('firstName').value,
                        lastName: document.getElementById('lastName').value,
                        age: document.getElementById('age').value,
                        gender: document.getElementById('gender').value,
                        birthDate: {
                            day: document.getElementById('birthDay').value,
                            month: document.getElementById('birthMonth').value,
                            year: document.getElementById('birthYear').value,
                        },
                    };

                    // Update the data in Firebase
                    update(userRef, updatedUser).then(() => {
                        console.log("User data updated successfully!");

                        // Reload the user data after saving the changes
                        get(userRef).then(snapshot => {
                            if (snapshot.exists()) {
                                const updatedUserData = snapshot.val();
                                
                                // Update the fields with the new data
                                document.getElementById('email').value = updatedUserData.email;
                                document.getElementById('password').value = updatedUserData.password;
                                document.getElementById('firstName').value = updatedUserData.firstName;
                                document.getElementById('lastName').value = updatedUserData.lastName;
                                document.getElementById('age').value = updatedUserData.age;
                                document.getElementById('gender').value = updatedUserData.gender;
                                document.getElementById('birthDay').value = updatedUserData.birthDate.day;
                                document.getElementById('birthMonth').value = updatedUserData.birthDate.month;
                                document.getElementById('birthYear').value = updatedUserData.birthDate.year;
                            }
                        });

                        // Disable the inputs and Save button again
                        document.getElementById('email').disabled = true;
                        document.getElementById('password').disabled = true;
                        document.getElementById('firstName').disabled = true;
                        document.getElementById('lastName').disabled = true;
                        document.getElementById('age').disabled = true;
                        document.getElementById('gender').disabled = true;
                        document.getElementById('birthDay').disabled = true;
                        document.getElementById('birthMonth').disabled = true;
                        document.getElementById('birthYear').disabled = true;
                        document.getElementById('basicSaveButton').disabled = true;

                        // Close the modal after saving
                        const userBasicDetailsModal = bootstrap.Modal.getInstance(document.getElementById('userBasicDetailsModal'));
                        userBasicDetailsModal.show();
                    }).catch(error => {
                        console.error("Error updating user data:", error);
                    });
                });

                // Attach the event listener for userBasicDetailsBtn
                document.getElementById('userBasicDetailsBtn').addEventListener('click', showUserBasicDetails);
                // Show gcash details in the modal when userGCashDetailsBtn is clicked
                const showUserGCashDetails = () => {
                    // Check if 'user.gcash' exists, and if not, set to an empty object
                    const gcash = user.gcash || {};
                
                    // Populate the address fields with the user's gcash data, if it exists
                    document.getElementById('gcashQrCode').src = gcash.qrCodeUrl;
                    document.getElementById('gcashName').value = gcash.gcashname || '';
                    document.getElementById('gcashNumber').value = gcash.gcashnum || '';

                
                
                    const userGCashModal = new bootstrap.Modal(document.getElementById('userGcashModal'));
                    userGCashModal.show();
                };
                

                // Attach the event listener for userAddressBtn
                document.getElementById('userGCashDetailsBtn').addEventListener('click', showUserGCashDetails);


                // Show address details in the modal when userAddressBtn is clicked
                const showUserAddressDetails = () => {
                    // Check if 'user.address' exists, and if not, set to an empty object
                    const address = user.address || {};
                    const additionalAddress = user.additionalAddress || {};
                
                    // Populate the address fields with the user's address data, if it exists
                    document.getElementById('addressStreet').value = address.street || '';
                    document.getElementById('addressBarangay').value = address.barangay || '';
                    document.getElementById('addressCity').value = address.city || '';
                    document.getElementById('addressProvince').value = address.province || '';
                    document.getElementById('addressZipCode').value = address.zipCode || '';
                
                    document.getElementById('additionalStreet').value = additionalAddress.street || '';
                    document.getElementById('additionalBarangay').value = additionalAddress.barangay || '';
                    document.getElementById('additionalCity').value = additionalAddress.city || '';
                    document.getElementById('additionalProvince').value = additionalAddress.province || '';
                    document.getElementById('additionalZipCode').value = additionalAddress.zipCode || '';
                    document.getElementById('additionalLandmark').value = additionalAddress.landmark || '';
                
                    const userAddressModal = new bootstrap.Modal(document.getElementById('userAddressModal'));
                    userAddressModal.show();
                };
                

                // Attach the event listener for userAddressBtn
                document.getElementById('userAddressBtn').addEventListener('click', showUserAddressDetails);

                // Handle the Edit button for user address
                document.getElementById('addressEditButton').addEventListener('click', () => {
                    // Enable the input fields for editing
                    document.getElementById('addressStreet').disabled = false;
                    document.getElementById('addressBarangay').disabled = false;
                    document.getElementById('addressCity').disabled = false;
                    document.getElementById('addressProvince').disabled = false;
                    document.getElementById('addressZipCode').disabled = false;

                    document.getElementById('additionalStreet').disabled = false;
                    document.getElementById('additionalBarangay').disabled = false;
                    document.getElementById('additionalCity').disabled = false;
                    document.getElementById('additionalProvince').disabled = false;
                    document.getElementById('additionalZipCode').disabled = false;
                    document.getElementById('additionalLandmark').disabled = false;

                    // Enable Save button
                    document.getElementById('addressSaveButton').disabled = false;
                });

                // Handle the Save button for user address
                    document.getElementById('addressSaveButton').addEventListener('click', () => {
                        // Retrieve updated values from the address form
                        const updatedAddress = {
                            street: document.getElementById('addressStreet').value,
                            barangay: document.getElementById('addressBarangay').value,
                            city: document.getElementById('addressCity').value,
                            province: document.getElementById('addressProvince').value,
                            zipCode: document.getElementById('addressZipCode').value
                        };

                        // Retrieve updated values for the additional address
                        const updatedAdditionalAddress = {
                            street: document.getElementById('additionalStreet').value,
                            barangay: document.getElementById('additionalBarangay').value,
                            city: document.getElementById('additionalCity').value,
                            province: document.getElementById('additionalProvince').value,
                            zipCode: document.getElementById('additionalZipCode').value,
                            landmark: document.getElementById('additionalLandmark').value
                        };

                        // Prepare the updates for both the main address and additional address
                        const updates = {
                            'address': updatedAddress,  // Main address
                            'additionalAddress': updatedAdditionalAddress // Additional address
                        };

                        // Update both the main address and additional address in Firebase
                        update(userRef, updates).then(() => {
                            console.log("User address updated successfully!");

                            // Reload the user data after saving the changes
                            get(userRef).then(snapshot => {
                                if (snapshot.exists()) {
                                    const updatedUserData = snapshot.val();

                                    // Update the modal inputs with new address data
                                    document.getElementById('addressStreet').value = updatedUserData.address.street || '';
                                    document.getElementById('addressBarangay').value = updatedUserData.address.barangay || '';
                                    document.getElementById('addressCity').value = updatedUserData.address.city || '';
                                    document.getElementById('addressProvince').value = updatedUserData.address.province || '';
                                    document.getElementById('addressZipCode').value = updatedUserData.address.zipCode || '';

                                    // Update the modal inputs with new additional address data
                                    document.getElementById('additionalStreet').value = updatedUserData.additionalAddress.street || '';
                                    document.getElementById('additionalBarangay').value = updatedUserData.additionalAddress.barangay || '';
                                    document.getElementById('additionalCity').value = updatedUserData.additionalAddress.city || '';
                                    document.getElementById('additionalProvince').value = updatedUserData.additionalAddress.province || '';
                                    document.getElementById('additionalZipCode').value = updatedUserData.additionalAddress.zipCode || '';
                                    document.getElementById('additionalLandmark').value = updatedUserData.additionalAddress.landmark || '';
                                }
                            });

                            // Disable the inputs and Save button again
                            document.getElementById('addressStreet').disabled = true;
                            document.getElementById('addressBarangay').disabled = true;
                            document.getElementById('addressCity').disabled = true;
                            document.getElementById('addressProvince').disabled = true;
                            document.getElementById('addressZipCode').disabled = true;

                            document.getElementById('additionalStreet').disabled = true;
                            document.getElementById('additionalBarangay').disabled = true;
                            document.getElementById('additionalCity').disabled = true;
                            document.getElementById('additionalProvince').disabled = true;
                            document.getElementById('additionalZipCode').disabled = true;
                            document.getElementById('additionalLandmark').disabled = true;

                            document.getElementById('addressSaveButton').disabled = true;

                            // Close the modal after saving
                            const userAddressModal = bootstrap.Modal.getInstance(document.getElementById('userAddressModal'));
                            userAddressModal.show();  // Close modal after saving
                        }).catch(error => {
                            console.error("Error updating user address:", error);
                        });
                    });
                    

            }
        }).catch(error => {
            console.error("Error getting user data: ", error);
        });
    }
});

document.getElementById('exportToCsvBtn').addEventListener('click', function () {
    exportTableToCSV('user_data.csv');
});

function exportTableToCSV(filename) {
    const table = document.getElementById('userTable');
    let csv = [];
    
    // Get table headers
    const headers = table.querySelectorAll('th');
    let headerRow = [];
    headers.forEach(header => {
        headerRow.push(header.innerText.trim());
    });
    csv.push(headerRow.join(',')); // Add header row to CSV

    // Get table rows (excluding header)
    const rows = table.querySelectorAll('tr');
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        let rowData = [];
        cells.forEach(cell => {
            rowData.push(cell.innerText.trim());
        });
        if (rowData.length > 0) {
            csv.push(rowData.join(','));
        }
    });

    // Create a CSV string and trigger download
    const csvString = csv.join('\n');
    const link = document.createElement('a');
    link.href = 'data:text/csv;charset=utf-8,' + encodeURI(csvString);
    link.download = filename;
    link.click();
}
