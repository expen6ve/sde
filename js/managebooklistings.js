import { getDatabase, ref, get, update, remove } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

// Initialize Firebase Auth and Database
const auth = getAuth();
const database = getDatabase();

window.addEventListener('DOMContentLoaded', () => {
    const bookTable = document.getElementById('userTable');

    if (bookTable) {
        const table = new simpleDatatables.DataTable(bookTable);

        // Reference to the "book-listings" node
        const booksRef = ref(database, 'book-listings');

        // Fetch the book listings data
        get(booksRef).then(snapshot => {
            if (snapshot.exists()) {
                const books = snapshot.val();
                const rows = [];

                const userPromises = []; // This will store all the promises for user data

                // Loop over all books
                for (const key in books) {
                    const book = books[key];

                    // Only proceed if bookStatus is 'pending'
                    if (book.bookStatus === 'pending') {

                        // Format dateListed to a human-readable format
                        const formattedDate = new Date(book.dateListed).toLocaleDateString("en-US", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric"
                        });

                        // Create a promise to fetch user details for each book
                        const userPromise = get(ref(database, `users/${book.userId}`))
                            .then(userSnapshot => {
                                if (userSnapshot.exists()) {
                                    const user = userSnapshot.val();
                                    const sellerName = `${user.firstName} ${user.lastName}`;

                                    // Construct the row data for this book
                                    rows.push([
                                        sellerName, 
                                        formattedDate,
                                        book.title,
                                        book.genre,
                                        `$${book.price}`,
                                        `<span class="status text-${book.bookStatus === 'verified' ? 'success' : book.bookStatus === 'pending' ? 'warning' : 'danger'} mt-0 mb-1"> &bull;</span>${book.bookStatus}`,
                                        `<a href="#" class="view-book" data-id="${key}" title="View"><i class="material-icons">&#x2714;</i></a>
                                        <a href="#" class="delete-book" data-id="${key}" title="Delete"><i class="material-icons">&#xE5C9;</i></a>`
                                    ]);
                                }
                            }).catch((error) => {
                                console.error("Error getting user data: ", error);
                            });

                        // Add the user promise to the list of promises
                        userPromises.push(userPromise);
                    }
                }

                // Wait for all the promises to resolve
                Promise.all(userPromises).then(() => {
                    // Add the rows after all data is retrieved
                    table.rows().add(rows);

                    // Add click event listener for the view-book icons
                    document.querySelectorAll('.view-book').forEach(viewBtn => {
                        viewBtn.addEventListener('click', function(event) {
                            event.preventDefault();

                            const bookId = this.getAttribute('data-id');
                            const book = books[bookId];

                            // Set the modal content with the book details
                            document.getElementById('moreInfoBookImage').src = book.imageUrl;
                            document.getElementById('moreInfoBookTitle').textContent = book.title;
                            document.getElementById('moreInfoAuthor').textContent = book.author;
                            document.getElementById('moreInfoGenre').textContent = book.genre;
                            document.getElementById('moreInfoCondition').textContent = book.condition;
                            document.getElementById('moreInfoDescription').textContent = book.description;
                            document.getElementById('moreInfoPrice').textContent = book.price;
                            document.getElementById('moreInfoStatus').textContent = book.bookStatus;

                            // Get the modal buttons
                            const approveButton = document.getElementById('approveListing');
                            const rejectButton = document.getElementById('rejectListing');

                            // Add event listener for the approve button
                            approveButton.addEventListener('click', () => {
                                const bookRef = ref(database, `book-listings/${bookId}`);
                                update(bookRef, { bookStatus: 'approved' })
                                    .then(() => {
                                        console.log("Book status updated to approved.");
                                        document.getElementById('moreInfoStatus').textContent = 'approved';
                                    }).catch(error => {
                                        console.error("Error updating book status: ", error);
                                    });
                            });

                            // Add event listener for the reject button
                            rejectButton.addEventListener('click', () => {
                                const bookRef = ref(database, `book-listings/${bookId}`);
                                update(bookRef, { bookStatus: 'rejected' })
                                    .then(() => {
                                        console.log("Book status updated to rejected.");
                                        document.getElementById('moreInfoStatus').textContent = 'rejected';
                                    }).catch(error => {
                                        console.error("Error updating book status: ", error);
                                    });
                            });

                            // Show the modal
                            new bootstrap.Modal(document.getElementById('bookMoreInfoModal')).show();
                        });
                    });

                    // Add event listener for the delete-book icons
                    document.querySelectorAll('.delete-book').forEach(deleteBtn => {
                        deleteBtn.addEventListener('click', function(event) {
                            event.preventDefault();

                            const bookId = this.getAttribute('data-id');
                            const bookRef = ref(database, `book-listings/${bookId}`);

                            // Delete the book from the database
                            remove(bookRef)
                                .then(() => {
                                    console.log("Book deleted successfully.");
                                    // Optionally, remove the row from the table
                                    const row = this.closest('tr');
                                    row.remove();
                                }).catch((error) => {
                                    console.error("Error deleting book: ", error);
                                });
                        });
                    });
                });
            } else {
                console.log("No data available");
            }
        }).catch((error) => {
            console.error("Error getting book listings data: ", error);
        });
    }
});
