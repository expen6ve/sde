import { getDatabase, ref, get, update, push, set } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";
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
                alert('Failed to update price. Please try again.');
            }
        } else {
            alert('Invalid price or no book selected.');
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
export async function confirmReqPaymentButton(currentUser, selectedChatKey) {
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

    // Fetch the book image URL
    const bookImageUrl = document.getElementById('selectedBookImage').src;

    if (!bookTitle || !bookPrice || !bookImageUrl) {
        alert('Please select a book to generate a payment slip.');
        return;
    }

    try {
        // Create the payment slip with formatted HTML message
        const paymentSlipMessage = `
            <div style="display: flex; flex-direction: column; align-items: center;">
                <p><strong>Payment Slip</strong></p>
                <p><strong>To Pay: ₱${bookPrice}</strong></p>
            </div>
        `;

        const paymentSlip = {
            bookTitle,
            bookPrice,
            bookImageUrl,
            timestamp: Date.now(),
            sender: currentUser.uid,
            receiver: receiverId,
            message: paymentSlipMessage, // Add formatted message
        };

        const paymentRef = push(ref(database, 'paymentsslip/'));
        const paymentKey = paymentRef.key;

        await set(paymentRef, paymentSlip);

        // Update each user's sent/received payment slips
        await update(ref(database, `users/${currentUser.uid}/sentPaymentSlips/${paymentKey}`), paymentSlip);
        await update(ref(database, `users/${receiverId}/receivedPaymentSlips/${paymentKey}`), paymentSlip);

        // Notify users in the chat with the payment slip
        const chatRef = push(ref(database, `chats/${selectedChatKey}`));

        await set(chatRef, {
            sender: currentUser.uid,
            receiver: receiverId,
            message: paymentSlipMessage,
            paymentSlip: paymentKey,
            timestamp: Date.now(),
            read: false,
        });

        console.log('Payment slip sent successfully.');
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
    const timestamp = Date.now();

    // If there's a receipt image, upload it to Firebase Storage
    let receiptImageUrl = null;
    if (receiptImage) {
        const receiptStorageRef = storageRef(storage, `payment-receipts/${currentUser.uid}/${timestamp}-${receiptImage.name}`);
        
        try {
            // Upload the image to Firebase Storage
            const snapshot = await uploadBytes(receiptStorageRef, receiptImage);
            // Get the download URL
            receiptImageUrl = await getDownloadURL(snapshot.ref);
        } catch (error) {
            console.error('Error uploading receipt image:', error);
            alert('Failed to upload receipt image.');
            return;
        }
    }

    // Create the confirmationSlip object
    const confirmationSlip = {
        bookPrice,
        timestamp,
        sender: currentUser.uid,
        receiver: receiverId,
        receiptImageUrl, // Save the image URL here
        status: "awaiting confirmation", // Payment status
    };

    try {
        // Save the confirmationSlip in the database
        const confirmationRef = push(ref(getDatabase(), 'paymenttoconfirm/'));
        const confirmationKey = confirmationRef.key;

        await set(confirmationRef, confirmationSlip);

        // Update sender and receiver records
        await update(ref(getDatabase(), `users/${currentUser.uid}/sentPaymentConfirmSlips/${confirmationKey}`), confirmationSlip);
        await update(ref(getDatabase(), `users/${receiverId}/receivedPaymentConfirmSlips/${confirmationKey}`), confirmationSlip);

        // Notify the chat with the confirmation slip
        const paymentSlipMessage = `
        <div style="display: flex; flex-direction: column; align-items: center;">
            <p><strong>Payment Sent</strong></p>
            <p><strong>Paid: ₱${bookPrice}</strong></p>
            <img src="/images/paymentcheck.gif" alt="Payment GIF" style="width: 200px; height: auto;">
            <button class="btn btn-primary mt-2" onclick="confirmPaidPayment('${confirmationKey}')">Confirm Payment</button>
        </div>
        `;
        

        const chatRef = push(ref(getDatabase(), `chats/${selectedChatKey}`));

        await set(chatRef, {
            sender: currentUser.uid,
            receiver: receiverId,
            message: paymentSlipMessage,
            confirmationSlip: confirmationKey, // Link to the confirmation slip
            timestamp: timestamp,
            read: false, // Default to unread
        });

        console.log('Payment confirmation slip sent successfully.');
    } catch (error) {
        console.error('Error sending payment confirmation slip:', error);
        alert('Failed to send the payment confirmation slip. Please try again.');
    }
}

// Confirm Payment Function (to be invoked by the button in the message)
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



