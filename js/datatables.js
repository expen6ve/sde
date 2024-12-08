import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";

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
    const datatablesSimple = document.getElementById('datatablesSimple');

    if (datatablesSimple) {
        const table = new simpleDatatables.DataTable(datatablesSimple);

        const booksRef = ref(database, 'sold-books');
        get(booksRef).then(snapshot => {
            if (snapshot.exists()) {
                const books = snapshot.val();
                console.log(books); // Verify the structure in console

                const rows = [];
                for (const key in books) {
                    const book = books[key];
                    rows.push([
                        book.title,
                        book.buyerId,
                        book.sellerId,
                        book.dateSold,
                        book.title,
                        `$${parseFloat(book.price).toFixed(2)}`
                    ]);
                }

                // Add the rows after DataTable is initialized
                table.rows().add(rows);
            } else {
                console.log("No data available");
            }
        }).catch((error) => {
            console.error("Error getting data: ", error);
        });
    }
});
