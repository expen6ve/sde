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
            // Filter for books owned by the user and with bookStatus of "approved"
            const books = Object.entries(booksSnapshot.val())
                .filter(([key, book]) => book.userId === currentUser.uid && book.bookStatus === "approved");

            bookDropdown.innerHTML = '';
            if (books.length > 0) {
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
                        selectedBookImage.src = bookDetails.imageUrl;
                        selectedBookImage.alt = bookDetails.title;
                        selectedBookTitle.textContent = bookDetails.title;
                        selectedBookPrice.value = bookDetails.price; // Set the latest price
                        selectedBookDetails.setAttribute('data-book-id', key); // Store the unique book ID
                        selectedBookKey = key; // Store the selected book's key
                    });
                    bookDropdown.appendChild(listItem);
                });
            } else {
                bookDropdown.innerHTML = '<li class="list-group-item text-muted">No approved books found</li>';
            }

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

export async function loadShippingDetails(currentUser) {
    try {
        const userSnapshot = await get(ref(database, `users/${currentUser.uid}`));

        if (userSnapshot.exists()) {
            const userData = userSnapshot.val();
            const address = userData.address;

            // Permanent address fields
            const shippingAddress = `${address.street}, ${address.barangay}, ${address.city}, ${address.province} - ${address.zipCode}`;
            document.getElementById('shippingAddress').textContent = shippingAddress;
            document.getElementById('newStreet').value = address.street;
            document.getElementById('newBarangay').value = address.barangay;
            document.getElementById('newCity').value = address.city;
            document.getElementById('newProvince').value = address.province;
            document.getElementById('newZipCode').value = address.zipCode;

            // Additional shipping address section
            const additionalAddress = userData.additionalAddress;
            if (additionalAddress) {
                const additionalShippingAddress = `${additionalAddress.street}, ${additionalAddress.barangay}, ${additionalAddress.city}, ${additionalAddress.province}, ${additionalAddress.zipCode} -  Landmark: ${additionalAddress.landmark}`;
                document.getElementById('additionalShippingAddress').textContent = additionalShippingAddress;

                // Populate editable fields
                document.getElementById('newAdditionalStreet').value = additionalAddress.street;
                document.getElementById('newAdditionalBarangay').value = additionalAddress.barangay;
                document.getElementById('newAdditionalCity').value = additionalAddress.city;
                document.getElementById('newAdditionalProvince').value = additionalAddress.province;
                document.getElementById('newAdditionalZipCode').value = additionalAddress.zipCode;
                document.getElementById('newLandmark').value = additionalAddress.landmark;

                document.getElementById('additionalShippingAddressDisplay').classList.remove('d-none');
                document.getElementById('additionalShippingAddressEdit').classList.add('d-none');
            } else {
                document.getElementById('additionalShippingAddress').textContent = "No additional address added.";
                document.getElementById('additionalShippingAddressDisplay').classList.remove('d-none');
                document.getElementById('additionalShippingAddressEdit').classList.add('d-none');
            }
        } else {
            console.error("User data not found");
        }
    } catch (error) {
        console.error("Error loading shipping details:", error);
    }
}

export function editShippingDetailsBtn() {
    // Keep Permanent Address static
    document.getElementById('shippingAddressDisplay').classList.remove('d-none');
    document.getElementById('shippingAddressEdit').classList.add('d-none');

    // Show the editable fields for Additional Shipping Address
    document.getElementById('additionalShippingAddressEdit').classList.remove('d-none');
    document.getElementById('editShippingDetailsBtn').classList.add('d-none');
    document.getElementById('saveShippingDetailsBtn').classList.remove('d-none');
}

export async function saveShippingDetailsBtn(currentUser) {
    // Gather updated values for Additional Shipping Address
    const updatedAdditionalAddress = {
        street: document.getElementById('newAdditionalStreet').value,
        barangay: document.getElementById('newAdditionalBarangay').value,
        city: document.getElementById('newAdditionalCity').value,
        province: document.getElementById('newAdditionalProvince').value,
        zipCode: document.getElementById('newAdditionalZipCode').value,
        landmark: document.getElementById('newLandmark').value // Include the landmark
    };

    try {
        // Update the database with the new Additional Address details
        await update(ref(database, `users/${currentUser.uid}`), {
            additionalAddress: updatedAdditionalAddress
        });

        // Update the displayed Additional Shipping Address
        const updatedAdditionalShippingAddress = `${updatedAdditionalAddress.street}, ${updatedAdditionalAddress.barangay}, ${updatedAdditionalAddress.city}, ${updatedAdditionalAddress.province}, Landmark: ${updatedAdditionalAddress.landmark} - ${updatedAdditionalAddress.zipCode}`;
        document.getElementById('additionalShippingAddress').textContent = updatedAdditionalShippingAddress;

        // Hide the editable fields and reset the buttons
        document.getElementById('shippingAddressDisplay').classList.remove('d-none');
        document.getElementById('additionalShippingAddressEdit').classList.add('d-none');
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

    // Get the unique book ID from the selected book details
    const selectedBookKey = document.getElementById('selectedBookDetails').getAttribute('data-book-id'); // Ensure you set this attribute when displaying book details

    try {
        const paymentSlipMessage = `
            <div style="display: flex; flex-direction: column; align-items: center;">
                <p><strong>Payment Slip</strong></p>
                <p><strong>To Pay: ₱${bookPrice}</strong></p>
            </div>
        `;

        // Check if there is an existing payment slip for this book
        const paymentSlipRef = ref(database, `paymentsslip/${selectedBookKey}`);
        const paymentSlipSnapshot = await get(paymentSlipRef);

        if (paymentSlipSnapshot.exists()) {
            // Fetch all messages in the chat to find the old payment slip message
            const chatSnapshot = await get(ref(database, `chats/${selectedChatKey}`));
            const chatMessages = chatSnapshot.val();

            for (const messageKey in chatMessages) {
                const message = chatMessages[messageKey];
                if (message.paymentSlip === selectedBookKey) {
                    // If this message contains the old payment slip, delete it
                    await remove(ref(database, `chats/${selectedChatKey}/${messageKey}`));
                    console.log('Old payment slip message deleted.');
                    break;
                }
            }

            // Now update the existing payment slip
            await update(paymentSlipRef, {
                bookPrice,
                timestamp: Date.now(),
                message: paymentSlipMessage,
            });
        } else {
            // If no payment slip exists, create a new one
            const newPaymentSlip = {
                bookId: selectedBookKey, // Tie slip to the specific book
                bookTitle,
                bookPrice,
                bookImageUrl,
                timestamp: Date.now(),
                sender: currentUser.uid,
                receiver: receiverId,
                message: paymentSlipMessage,
            };
            await set(paymentSlipRef, newPaymentSlip);
        }

        // Notify the chat with the updated or new payment slip
        const chatRef = push(ref(database, `chats/${selectedChatKey}`));
        await set(chatRef, {
            sender: currentUser.uid,
            receiver: receiverId,
            message: paymentSlipMessage,
            paymentSlip: selectedBookKey,
            timestamp: Date.now(),
            read: false,
        });

        // Refresh the chat UI after sending the payment slip
        await loadMessages(selectedChatKey);
        console.log('Payment slip sent successfully.');
    } catch (error) {
        console.error('Error sending payment slip:', error);
        alert('Failed to send the payment slip. Please try again.');
    }
}

// Modify viewPaymentSlip to extract and store the bookId globally
export async function viewPaymentSlip(paymentSlipId) {
    try {
        const paymentSlipRef = ref(database, `paymentsslip/${paymentSlipId}`);
        const paymentSlipSnapshot = await get(paymentSlipRef);
        console.log(paymentSlipId);
        
        if (paymentSlipSnapshot.exists()) {
            const paymentSlip = paymentSlipSnapshot.val();
            const bookTitle = paymentSlip.bookTitle;
            const bookPrice = paymentSlip.bookPrice;
            const bookImageUrl = paymentSlip.bookImageUrl;
            const bookId = paymentSlip.bookId;  // Fetch the bookId

            // Check if the book is already sold in the "sold-books" node
            const soldBooksRef = ref(database, `sold-books`);
            const soldBooksSnapshot = await get(soldBooksRef);
            let isBookSold = false;

            if (soldBooksSnapshot.exists()) {
                const soldBooks = soldBooksSnapshot.val();
                for (let key in soldBooks) {
                    if (soldBooks[key].bookId === bookId) {
                        isBookSold = true;
                        break;
                    }
                }
            }

            // If the book is sold, show a modal with the message
            if (isBookSold) {
                const modalContent = document.getElementById('receiptModalContent');
                modalContent.innerHTML = `
                    <div style="text-align: center; display: flex; flex-direction: column; justify-content: flex-end;">
                        <p><strong>Book is already paid or sold!</strong></p>
                    </div>
                `;

                const receiptModal = new bootstrap.Modal(document.getElementById('receiptModal'));
                receiptModal.show();
                return; // Exit the function if the book is already sold
            }

            // Store the bookId in a session variable or global variable
            sessionStorage.setItem('currentBookId', bookId); // Using sessionStorage for simplicity

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


// Function to send a paid payment confirmation slip
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

    // Retrieve the bookId from session storage
    const bookId = sessionStorage.getItem('currentBookId');  // Fetch the stored bookId
    if (!bookId) {
        alert('Error: Book ID not found.');
        return;
    }

    // Get the selected address from the dropdown
    const selectedAddress = document.getElementById('addressSelect').value;
    console.log(selectedAddress);

    // Fetch the selected address from the user data
    let addressDetails;
    const userSnapshot = await get(ref(database, `users/${currentUser.uid}`));
    if (userSnapshot.exists()) {
        const userData = userSnapshot.val();
        if (selectedAddress === 'address') {
            addressDetails = userData.address;
        } else if (selectedAddress === 'additionalAddress' && userData.additionalAddress) {
            addressDetails = userData.additionalAddress;
        } else {
            alert('Selected address is not available.');
            return;
        }
    }

    // Create the address string
    const addressString = `${addressDetails.street}, ${addressDetails.barangay}, ${addressDetails.city}, ${addressDetails.province} - ${addressDetails.zipCode}`;

    // Initialize receiptImageUrl to null
    let receiptImageUrl = null;

    // If there's a receipt image, upload it to Firebase Storage
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
        bookId,  // Include the bookId in the confirmation slip
        bookPrice,
        timestamp,
        sender: currentUser.uid,
        receiver: receiverId,
        receiptImageUrl, 
        address: addressString, // Add the selected address
        status: "awaiting confirmation",
    };

    // Now, proceed to save the confirmation slip and send the message
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
                receiptImageUrl,
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
            <p><strong>Shipping Address: </strong>${addressString}</p>
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
            const { status, bookId, sender, receiptImageUrl } = confirmationSlip; // sender is the buyerId

            // If the payment is already confirmed, display the "Payment has already been Confirmed" modal
            if (status === "confirmed") {
                const modalContent = document.getElementById('receiptModalContent');
                modalContent.innerHTML = `
                    <div style="text-align: center; display: flex; flex-direction: column; justify-content: flex-end;">
                        <p><strong>Payment has already been confirmed.</strong></p>
                    </div>
                `;

                const receiptModal = new bootstrap.Modal(document.getElementById('receiptModal'));
                receiptModal.show();
                return; // Exit the function if already confirmed
            }

            // If a receipt image URL is present, display it in a modal
            if (receiptImageUrl) {
                const modalContent = document.getElementById('receiptModalContent');
                modalContent.innerHTML = `
                    <div style="text-align: center; display: flex; flex-direction: column; justify-content: flex-end;">
                        <h5>Payment Receipt</h5>
                        <img src="${receiptImageUrl}" alt="Receipt Image" style="max-width: 100%; height: auto; margin-bottom: 1rem;">
                        <button id="continueConfirmPayment" class="btn btn-primary">Continue</button>
                    </div>
                `;

                const receiptModal = new bootstrap.Modal(document.getElementById('receiptModal'));
                receiptModal.show();

                // Handle the "Continue" button click
                document.getElementById('continueConfirmPayment').addEventListener('click', async () => {
                    // Fetch the book details using the bookId
                    const bookRef = ref(database, `book-listings/${bookId}`);
                    const bookSnapshot = await get(bookRef);

                    if (!bookSnapshot.exists()) {
                        alert('Book not found.');
                        return;
                    }

                    const book = bookSnapshot.val();
                    const { title, author, price, imageUrl, userId, genre, condition } = book; // Get the userId from book-listings

                    // Create a new entry in the "sold-books" node
                    const soldBookRef = push(ref(database, `sold-books/`));
                    const soldBookKey = soldBookRef.key;

                    // Store the sold book details, including the buyerId
                    await set(soldBookRef, {
                        bookId: bookId,
                        title: title,
                        author: author,
                        condition: condition,
                        genre: genre,
                        price: price,
                        imageUrl: imageUrl,
                        sellerId: userId, // Correctly assign the sellerId from book-listings
                        buyerId: sender, // Store the buyerId (sender) from the confirmation slip
                        dateSold: new Date().toISOString(),
                    });

                    // Update the seller's "soldBooks" reference
                    await update(ref(database, `users/${userId}/soldBooks/${soldBookKey}`), {
                        bookId: bookId,
                        title: title,
                        buyerId: sender,
                        price: price,
                        dateSold: new Date().toISOString(),
                    });

                    // After payment confirmation, send the feedback message to the buyer
                    const feedbackMessage = `
                    <div style="text-align: center; display: flex; flex-direction: column; align-items: center;">
                        <p><strong>Thank you for your purchase!</strong></p>
                        <p>We'd love to hear your feedback on the transaction. Please leave a review!</p>
                        <button class="btn btn-primary" onclick="redirectToReviewPage('${confirmationSlip.receiver}')">Leave a Review</button>
                    </div>
                    `;

                    const chatKey = `${sender}_${confirmationSlip.receiver}`; // Construct the chat key
                    const chatRef = push(ref(database, `chats/${chatKey}`));

                    await set(chatRef, {
                        sender: confirmationSlip.receiver, // Current user is sending the message
                        receiver: sender, // Buyer is the recipient
                        message: feedbackMessage,
                        timestamp: Date.now(),
                        read: false,
                    });

                    // Delete the book from the "book-listings" node
                    await remove(bookRef);

                    // Update the status to "confirmed"
                    await update(confirmationSlipRef, { status: "confirmed" });

                    receiptModal.hide();
                    console.log(`Payment confirmation slip ${confirmationKey} has been confirmed.`);
                    alert('Payment confirmed successfully!');
                    
                });
            } else {
                // If no receipt image, immediately confirm the payment
                // Fetch the book details using the bookId
                const bookRef = ref(database, `book-listings/${bookId}`);
                const bookSnapshot = await get(bookRef);

                if (!bookSnapshot.exists()) {
                    alert('Book not found or has been Sold');
                    return;
                }

                const book = bookSnapshot.val();
                const { title, author, price, imageUrl, userId, genre, condition } = book; // Get the userId from book-listings

                // Create a new entry in the "sold-books" node
                const soldBookRef = push(ref(database, `sold-books/`));
                const soldBookKey = soldBookRef.key;

                // Store the sold book details, including the buyerId
                await set(soldBookRef, {
                    bookId: bookId,
                    title: title,
                    author: author,
                    condition: condition,
                    genre: genre,
                    price: price,
                    imageUrl: imageUrl,
                    sellerId: userId, // Correctly assign the sellerId from book-listings
                    buyerId: sender, // Store the buyerId (sender) from the confirmation slip
                    dateSold: new Date().toISOString(),
                });

                // Update the seller's "soldBooks" reference
                await update(ref(database, `users/${userId}/soldBooks/${soldBookKey}`), {
                    bookId: bookId,
                    title: title,
                    buyerId: sender,
                    price: price,
                    dateSold: new Date().toISOString(),
                });

                // After payment confirmation, send the feedback message to the buyer
                const feedbackMessage = `
                <div style="text-align: center; display: flex; flex-direction: column; align-items: center;">
                    <p><strong>Thank you for your purchase!</strong></p>
                    <p>We'd love to hear your feedback on the transaction. Please leave a review!</p>
                    <button class="btn btn-primary" onclick="redirectToReviewPage('${confirmationSlip.receiver}')">Leave a Review</button>
                </div>
                `;

                const chatKey = `${sender}_${confirmationSlip.receiver}`; // Construct the chat key
                const chatRef = push(ref(database, `chats/${chatKey}`));

                await set(chatRef, {
                    sender: confirmationSlip.receiver, // Current user is sending the message
                    receiver: sender, // Buyer is the recipient
                    message: feedbackMessage,
                    timestamp: Date.now(),
                    read: false,
                });

                // Delete the book from the "book-listings" node
                await remove(bookRef);

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
