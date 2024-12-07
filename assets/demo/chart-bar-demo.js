import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";

// Fetch sold books data from Firebase and update the chart
async function fetchSoldBooksData() {
    const database = getDatabase();
    const soldBooksRef = ref(database, 'sold-books');
    const snapshot = await get(soldBooksRef);

    if (snapshot.exists()) {
        const soldBooks = snapshot.val();
        const monthlySales = new Array(12).fill(0); // Array to hold sales for each month

        Object.values(soldBooks).forEach(book => {
            if (book.dateSold) {
                const date = new Date(book.dateSold);
                const month = date.getMonth(); // 0 = January, 11 = December
                monthlySales[month]++; // Increment the count for the respective month
            }
        });

        // Update the chart with the new data
        updateSoldBooksChart(monthlySales);
    } else {
        console.log("No sold books data found.");
    }
}

// Function to update the chart dynamically
function updateSoldBooksChart(data) {
    const ctx = document.getElementById("myBarChart");
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
            datasets: [{
                label: "Books Sold",
                backgroundColor: "rgba(2,117,216,1)",
                borderColor: "rgba(2,117,216,1)",
                data: data, // Dynamic data from Firebase
            }],
        },
        options: {
            scales: {
                xAxes: [{
                    time: {
                        unit: 'month'
                    },
                    gridLines: {
                        display: false
                    },
                    ticks: {
                        maxTicksLimit: 6
                    }
                }],
                yAxes: [{
                    ticks: {
                        min: 0,
                        max: Math.max(...data) + 5, // Adjust the max limit dynamically
                        maxTicksLimit: 5
                    },
                    gridLines: {
                        display: true
                    }
                }],
            },
            legend: {
                display: false
            }
        }
    });
}

// Call the function on page load
document.addEventListener("DOMContentLoaded", fetchSoldBooksData);
