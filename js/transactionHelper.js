import { getDatabase, ref, get, update, push, set, remove } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js";

const database = getDatabase();
const storage = getStorage();
let currentUser = null;

export async function loadUserBooks(currentUser) {
    const bookSearch = document.getElementById('bookSearch');
    const bookDropdown = document.getElementById('bookDropdown');
    const selectedBookDetails = document.getElementById('selectedBookDetails');
    const selectedBookImage = document.getElementById('selectedBookImage');
    const selectedBookTitle = document.getElementById('selectedBookTitle');
    const selectedBookPrice = document.getElementById('selectedBookPrice');
    const editPriceButton = document.getElementById('editPriceButton');
    const savePriceButton = document.getElementById('savePriceButton');
    
    let selectedBookKey = null; // Variable to store the selected book's key

    function clearBookDetails() {
        selectedBookDetails.style.display = 'none';
        selectedBookImage.src = '';
        selectedBookTitle.textContent = '';
        selectedBookPrice.value = '';
        selectedBookKey = null; // Clear selected book key
    }

    try {
        const booksSnapshot = await get(ref(database, 'book-listings/'));
        if (booksSnapshot.exists()) {
            const books = Object.entries(booksSnapshot.val()).filter(([key, book]) => book.userId === currentUser.uid);

            bookDropdown.innerHTML = '';
            books.forEach(([key, book]) => {
                const listItem = document.createElement('li');
                listItem.className = 'list-group-item';
                listItem.textContent = book.title;
                listItem.style.cursor = 'pointer';
                listItem.addEventListener('click', async () => {
                    // Reset the selected book details
                    clearBookDetails();

                    // Update the search box
                    bookSearch.value = book.title;
                    bookDropdown.style.display = 'none';

                    // Fetch the latest book details from the database
                    const bookDetails = (await get(ref(database, `book-listings/${key}`))).val();
                    
                    // Display selected book details
                    selectedBookDetails.style.display = 'block';
                    selectedBookImage.src = bookDetails.imageUrl ;
                    selectedBookImage.alt = bookDetails.title;
                    selectedBookTitle.textContent = bookDetails.title;
                    selectedBookPrice.value = bookDetails.price; // Set the latest price
                    selectedBookKey = key; // Store the selected book's key
                });
                bookDropdown.appendChild(listItem);
            });

            bookSearch.addEventListener('input', () => {
                const query = bookSearch.value.toLowerCase();
                let visibleCount = 0;
                Array.from(bookDropdown.children).forEach(item => {
                    if (item.textContent.toLowerCase().includes(query)) {
                        item.style.display = 'block';
                        visibleCount++;
                    } else {
                        item.style.display = 'none';
                    }
                });

                bookDropdown.style.display = visibleCount > 0 ? 'block' : 'none';

                // Clear book details if no book is selected
                if (!query) {
                    clearBookDetails();
                }
            });

            bookSearch.addEventListener('blur', () => {
                setTimeout(() => (bookDropdown.style.display = 'none'), 100);
            });

            bookSearch.addEventListener('focus', () => {
                if (bookDropdown.children.length > 0) {
                    bookDropdown.style.display = 'block';
                }
            });
        } else {
            bookDropdown.innerHTML = '<li class="list-group-item text-muted">No books found</li>';
        }
    } catch (error) {
        console.error('Error loading user books:', error);
    }

    // Event listener for Edit button
    editPriceButton.addEventListener('click', () => {
        selectedBookPrice.removeAttribute('readonly');
        editPriceButton.style.display = 'none';
        savePriceButton.style.display = 'inline-block';
    });

    // Event listener for Save button
    savePriceButton.addEventListener('click', async () => {
        const newPrice = parseFloat(selectedBookPrice.value).toFixed(2);
        if (selectedBookKey && !isNaN(newPrice)) {
            console.log('Updating price for book:', selectedBookKey);  // Log the book being updated
            try {
                // Update the price for the specific book
                await update(ref(database, `book-listings/${selectedBookKey}`), {
                    price: newPrice,
                });
    
                console.log('Price updated successfully!');
                
                // Update the UI immediately
                selectedBookPrice.setAttribute('readonly', true);
                selectedBookPrice.value = newPrice;  // Update the price input field with the new price
                editPriceButton.style.display = 'inline-block';
                savePriceButton.style.display = 'none';
            } catch (error) {
                console.error('Error updating price:', error);
                console.log('Failed to update price. Please try again.');
            }
        } else {
            console.log('Invalid price or no book selected.');
        }
    });
}


export async function loadShippingDetails(currentUser) {
    try {
        const userSnapshot = await get(ref(database, `users/${currentUser.uid}`));
        
        if (userSnapshot.exists()) {
            const userData = userSnapshot.val();
            const address = userData.address;
            const shippingAddress = `${address.street}, ${address.barangay}, ${address.city}, ${address.province} - ${address.zipCode}`;
            document.getElementById('shippingAddress').textContent = shippingAddress;
            document.getElementById('newStreet').value = address.street;
            document.getElementById('newBarangay').value = address.barangay;
            document.getElementById('newCity').value = address.city;
            document.getElementById('newProvince').value = address.province;
            document.getElementById('newZipCode').value = address.zipCode;
        } else {
            console.error("User data not found");
        }
    } catch (error) {
        console.error("Error loading shipping details:", error);
    }
}

export async function loadGcashDetails(currentUser) {
    try {
        const userSnapshot = await get(ref(database, `users/${currentUser.uid}/gcash`));
        
        if (userSnapshot.exists()) {
            const gcashData = userSnapshot.val();
            document.getElementById('gcashDetails').style.display = 'block';
            document.getElementById('gcashName').textContent = gcashData.gcashname || 'N/A';
            document.getElementById('gcashNumber').textContent = gcashData.gcashnum || 'N/A';
        } else {
            console.log("GCash details not found for the user.");
        }
    } catch (error) {
        console.error('Error loading GCash details:', error);
    }
}

export function editShippingDetailsBtn() {
    document.getElementById('shippingAddressDisplay').classList.add('d-none');
    document.getElementById('shippingAddressEdit').classList.remove('d-none');
    document.getElementById('editShippingDetailsBtn').classList.add('d-none');
    document.getElementById('saveShippingDetailsBtn').classList.remove('d-none');
}

export async function saveShippingDetailsBtn(currentUser) {
    const updatedAddress = {
        street: document.getElementById('newStreet').value,
        barangay: document.getElementById('newBarangay').value,
        city: document.getElementById('newCity').value,
        province: document.getElementById('newProvince').value,
        zipCode: document.getElementById('newZipCode').value
    };

    try {
        await update(ref(database, `users/${currentUser.uid}`), {
            address: updatedAddress
        });

        const updatedShippingAddress = `${updatedAddress.street}, ${updatedAddress.barangay}, ${updatedAddress.city}, ${updatedAddress.province} - ${updatedAddress.zipCode}`;
        document.getElementById('shippingAddress').textContent = updatedShippingAddress;

        document.getElementById('shippingAddressDisplay').classList.remove('d-none');
        document.getElementById('shippingAddressEdit').classList.add('d-none');
        document.getElementById('editShippingDetailsBtn').classList.remove('d-none');
        document.getElementById('saveShippingDetailsBtn').classList.add('d-none');
    } catch (error) {
        console.error('Error saving updated shipping details:', error);
    }
}

// Function to handle confirmPaymentButton click
export async function confirmReqPaymentButton(currentUser, selectedChatKey, renderedMessages = {}) {
    if (!currentUser) {
        alert('You must be logged in to send a payment slip.');
        return;
    }

    if (!selectedChatKey) {
        alert('Please select a chat to proceed.');
        return;
    }

    const bookTitle = document.getElementById('selectedBookTitle').textContent;
    const bookPrice = parseFloat(document.getElementById('selectedBookPrice').value).toFixed(2);
    const receiverId = selectedChatKey.split('_').find(id => id !== currentUser.uid);
    const bookImageUrl = document.getElementById('selectedBookImage').src;

    if (!bookTitle || !bookPrice || !bookImageUrl) {
        alert('Please select a book to generate a payment slip.');
        return;
    }

    try {
        const paymentSlipMessage = `
            <div style="display: flex; flex-direction: column; align-items: center;">
                <p><strong>Payment Slip</strong></p>
                <p><strong>To Pay: ₱${bookPrice}</strong></p>
            </div>
        `;

        // Step 1: Check for an existing payment slip
        const paymentSlipsSnapshot = await get(ref(database, 'paymentsslip/'));
        let existingSlipKey = null;

        if (paymentSlipsSnapshot.exists()) {
            const paymentSlips = paymentSlipsSnapshot.val();

            for (const [key, slip] of Object.entries(paymentSlips)) {
                if (
                    slip.bookTitle === bookTitle &&
                    slip.sender === currentUser.uid &&
                    slip.receiver === receiverId
                ) {
                    existingSlipKey = key;
                    break;
                }
            }
        }

        let paymentKey = existingSlipKey;

        // Step 2: Update the existing payment slip or create a new one
        if (existingSlipKey) {
            // Remove old payment slip message in the chat
            const chatMessagesSnapshot = await get(ref(database, `chats/${selectedChatKey}`));
            if (chatMessagesSnapshot.exists()) {
                const chatMessages = chatMessagesSnapshot.val();
        
                for (const [messageKey, messageData] of Object.entries(chatMessages)) {
                    if (messageData.paymentSlip === existingSlipKey) {
                        await remove(ref(database, `chats/${selectedChatKey}/${messageKey}`));
        
                        // Ensure renderedMessages state is cleared for this key
                        delete renderedMessages[messageKey];
                        break; // Stop after removing the first matching message
                    }
                }
            }
        
            // Update the existing payment slip in Firebase
            await update(ref(database, `paymentsslip/${existingSlipKey}`), {
                bookPrice,
                timestamp: Date.now(),
                message: paymentSlipMessage,
            });
        
            // Update user-specific payment slip records
            await update(ref(database, `users/${currentUser.uid}/sentPaymentSlips/${existingSlipKey}`), {
                bookPrice,
                timestamp: Date.now(),
            });
            await update(ref(database, `users/${receiverId}/receivedPaymentSlips/${existingSlipKey}`), {
                bookPrice,
                timestamp: Date.now(),
            });
        } else {
            // Create a new payment slip
            const newPaymentSlip = {
                bookTitle,
                bookPrice,
                bookImageUrl,
                timestamp: Date.now(),
                sender: currentUser.uid,
                receiver: receiverId,
                message: paymentSlipMessage,
            };

            const paymentRef = push(ref(database, 'paymentsslip/'));
            paymentKey = paymentRef.key;

            await set(paymentRef, newPaymentSlip);

            // Update each user's sent/received payment slips
            await update(ref(database, `users/${currentUser.uid}/sentPaymentSlips/${paymentKey}`), newPaymentSlip);
            await update(ref(database, `users/${receiverId}/receivedPaymentSlips/${paymentKey}`), newPaymentSlip);
        }

        // Notify the chat with the updated or new payment slip
        const chatRef = push(ref(database, `chats/${selectedChatKey}`));
        await set(chatRef, {
            sender: currentUser.uid,
            receiver: receiverId,
            message: paymentSlipMessage,
            paymentSlip: paymentKey,
            timestamp: Date.now(),
            read: false,
        });

        // After sending the payment slip, refresh the UI
        await loadMessages(selectedChatKey);
    } catch (error) {
        console.error('Error sending payment slip:', error);
        alert('Failed to send the payment slip. Please try again.');
    }
}

// Function to view the payment slip in a modal
export async function viewPaymentSlip(paymentSlipId) {
    try {
        const paymentSlipRef = ref(database, `paymentsslip/${paymentSlipId}`);
        const paymentSlipSnapshot = await get(paymentSlipRef);

        if (paymentSlipSnapshot.exists()) {
            const paymentSlip = paymentSlipSnapshot.val();
            const bookTitle = paymentSlip.bookTitle;
            const bookPrice = paymentSlip.bookPrice;
            const bookImageUrl = paymentSlip.bookImageUrl;

            document.getElementById('bookTitle').textContent = bookTitle;
            document.getElementById('bookPrice').textContent = `Price: ₱${parseFloat(bookPrice).toFixed(2)}`;
            document.getElementById('bookImage').src = bookImageUrl;

            // Fetch seller's details
            const sellerRef = ref(database, `users/${paymentSlip.sender}`);
            const sellerSnapshot = await get(sellerRef);

            if (sellerSnapshot.exists()) {
                const sellerData = sellerSnapshot.val();
                const gcashName = sellerData.gcash.gcashname;
                const gcashNumber = sellerData.gcash.gcashnum;
                const gcashQrCodeUrl = sellerData.gcash.qrCodeUrl;

                document.getElementById('slipGcashName').textContent = `Name: ${gcashName}`;
                document.getElementById('slipGcashNumber').textContent = `Number: ${gcashNumber}`;
                document.getElementById('slipGcashQr').src = gcashQrCodeUrl;

            } else {
                console.error("Seller details not found.");
            }

            const paymentSlipModal = new bootstrap.Modal(document.getElementById('paymentSlipModal'));
            paymentSlipModal.show();
        } else {
            alert('Payment slip not found.');
        }
    } catch (error) {
        console.error('Error fetching payment slip:', error);
        alert('Failed to load payment slip details.');
    }
}
//Function to send a paid payment confirmation slip
export async function paymentForTheBookIsSent(currentUser, selectedChatKey) {
    if (!currentUser) {
        alert('You must be logged in to confirm payment.');
        return;
    }

    if (!selectedChatKey) {
        alert('Please select a chat to proceed.');
        return;
    }

    const bookPrice = document.getElementById('bookPrice').textContent.replace('Price: ₱', '').trim(); // Get the price dynamically
    const receiverId = selectedChatKey.split('_').find(id => id !== currentUser.uid); // Get the other user's ID
    const receiptImage = document.getElementById('receiptImage').files[0];
    const paymentSlipModalElement = document.getElementById('paymentSlipModal'); // Reference to modal element
    const paymentSlipModal = bootstrap.Modal.getInstance(paymentSlipModalElement) || new bootstrap.Modal(paymentSlipModalElement); // Ensure modal instance exists
    const timestamp = Date.now();

    // If there's a receipt image, upload it to Firebase Storage
    let receiptImageUrl = null;
    if (receiptImage) {
        const receiptStorageRef = storageRef(storage, `payment-receipts/${currentUser.uid}/${timestamp}-${receiptImage.name}`);
        try {
            const snapshot = await uploadBytes(receiptStorageRef, receiptImage);
            receiptImageUrl = await getDownloadURL(snapshot.ref);
        } catch (error) {
            console.error('Error uploading receipt image:', error);
            alert('Failed to upload receipt image.');
            return;
        }
    }

    const confirmationSlip = {
        bookPrice,
        timestamp,
        sender: currentUser.uid,
        receiver: receiverId,
        receiptImageUrl,
        status: "awaiting confirmation",
    };

    try {
        let existingSlipKey = null;
        const confirmationSlipsSnapshot = await get(ref(database, `paymenttoconfirm/`));

        if (confirmationSlipsSnapshot.exists()) {
            const confirmationSlips = confirmationSlipsSnapshot.val();

            for (const [key, slip] of Object.entries(confirmationSlips)) {
                if (
                    slip.sender === currentUser.uid &&
                    slip.receiver === receiverId &&
                    slip.bookPrice === bookPrice
                ) {
                    existingSlipKey = key;
                    break;
                }
            }
        }

        if (existingSlipKey) {
            const chatMessagesSnapshot = await get(ref(database, `chats/${selectedChatKey}`));
            if (chatMessagesSnapshot.exists()) {
                const chatMessages = chatMessagesSnapshot.val();
                for (const [messageKey, messageData] of Object.entries(chatMessages)) {
                    if (messageData.confirmationSlip === existingSlipKey) {
                        await remove(ref(database, `chats/${selectedChatKey}/${messageKey}`));
                        break;
                    }
                }
            }

            await update(ref(database, `paymenttoconfirm/${existingSlipKey}`), {
                ...confirmationSlip,
                timestamp,
            });
        } else {
            const confirmationRef = push(ref(database, 'paymenttoconfirm/'));
            const confirmationKey = confirmationRef.key;

            await set(confirmationRef, { ...confirmationSlip, confirmationKey });
            await update(ref(database, `users/${currentUser.uid}/sentPaymentConfirmSlips/${confirmationKey}`), confirmationSlip);
            await update(ref(database, `users/${receiverId}/receivedPaymentConfirmSlips/${confirmationKey}`), confirmationSlip);

            existingSlipKey = confirmationKey;
        }

        const paymentSlipMessage = `
        <div style="display: flex; flex-direction: column; align-items: center;">
            <p><strong>Payment Sent</strong></p>
            <p><strong>Paid: ₱${bookPrice}</strong></p>
            <img src="images/paymentcheck.gif" alt="Payment GIF" style="width: 200px; height: auto;">
        </div>
        `;

        const chatRef = push(ref(database, `chats/${selectedChatKey}`));
        await set(chatRef, {
            sender: currentUser.uid,
            receiver: receiverId,
            message: paymentSlipMessage,
            confirmationSlip: existingSlipKey,
            timestamp,
            read: false,
        });

        console.log('Payment confirmation slip sent successfully.');
    } catch (error) {
        console.error('Error sending payment confirmation slip:', error);
        alert('Failed to send the payment confirmation slip. Please try again.');
    } finally {
        // Hide the modal after the operation
        paymentSlipModal.hide();
    }
}



// Confirm Payment Function (to be invoked by the button in the message)
export async function confirmPaidPayment(confirmationKey) {
    if (!confirmationKey) {
        console.error('No confirmation slip key provided.');
        alert('Invalid confirmation slip.');
        return;
    }

    try {
        // Fetch the confirmation slip from the database using the key
        const confirmationSlipRef = ref(database, `paymenttoconfirm/${confirmationKey}`);
        const confirmationSlipSnapshot = await get(confirmationSlipRef);

        if (confirmationSlipSnapshot.exists()) {
            const confirmationSlip = confirmationSlipSnapshot.val();
            const { receiptImageUrl } = confirmationSlip;

            // If a receipt image URL is present, display it in a modal
            if (receiptImageUrl) {
                const modalContent = document.getElementById('receiptModalContent');
                modalContent.innerHTML = `
                    <div style="text-align: center;">
                        <h5>Payment Receipt</h5>
                        <img src="${receiptImageUrl}" alt="Receipt Image" style="max-width: 100%; height: auto; margin-bottom: 1rem;">
                        <button id="continueConfirmPayment" class="btn btn-primary">Continue</button>
                    </div>
                `;

                const receiptModal = new bootstrap.Modal(document.getElementById('receiptModal'));
                receiptModal.show();

                // Handle the "Continue" button click
                document.getElementById('continueConfirmPayment').addEventListener('click', async () => {
                    // Update the status to confirmed
                    await update(confirmationSlipRef, { status: "confirmed" });

                    receiptModal.hide();
                    console.log(`Payment confirmation slip ${confirmationKey} has been confirmed.`);
                    alert('Payment confirmed successfully!');
                });
            } else {
                // If no receipt image, immediately confirm the payment
                await update(confirmationSlipRef, { status: "confirmed" });
                console.log(`Payment confirmation slip ${confirmationKey} has been confirmed.`);
                alert('Payment confirmed successfully!');
            }
        } else {
            alert('Confirmation slip not found.');
        }
    } catch (error) {
        console.error('Error confirming payment slip:', error);
        alert('Failed to confirm the payment. Please try again.');
    }
}



