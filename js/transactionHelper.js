import { getDatabase, ref, get, update } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";

const database = getDatabase();
let currentUser = null;

export let selectedBookKey = null; // Global variable to store selected book key

export async function loadUserBooks(currentUser) {
    const bookSearch = document.getElementById('bookSearch');
    const bookDropdown = document.getElementById('bookDropdown');
    const selectedBookDetails = document.getElementById('selectedBookDetails');
    const selectedBookImage = document.getElementById('selectedBookImage');
    const selectedBookTitle = document.getElementById('selectedBookTitle');
    const selectedBookPrice = document.getElementById('selectedBookPrice');
    const editPriceButton = document.getElementById('editPriceButton');
    const savePriceButton = document.getElementById('savePriceButton');

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
                    selectedBookImage.src = bookDetails.imageUrl || 'https://via.placeholder.com/150';
                    selectedBookImage.alt = bookDetails.title;
                    selectedBookTitle.textContent = bookDetails.title;
                    selectedBookPrice.value = bookDetails.price; // Set the latest price
                    selectedBookKey = key; // Store the selected book's key globally
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
            try {
                // Update the price for the specific book
                await update(ref(database, `book-listings/${selectedBookKey}`), {
                    price: newPrice,
                });
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
