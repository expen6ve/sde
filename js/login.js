import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCN8NcVQNRjAF_A86a8NfxC9Audivokuso",
  authDomain: "sde-ecoread.firebaseapp.com",
  databaseURL: "https://sde-ecoread-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "sde-ecoread",
  storageBucket: "sde-ecoread.appspot.com",
  messagingSenderId: "137637739158",
  appId: "1:137637739158:web:c9b885cf9025c89e2c60b7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// Get form references  
const emailInput = document.getElementById("emailInput");
const passInput = document.getElementById("passInput");
const loginButton = document.getElementById("loginButton");
const forgotPasswordLink = document.querySelector('a[href="#"]');

// Add event listener for form submission
loginButton.addEventListener("click", async (e) => {
  e.preventDefault(); // Prevent default form submission

  const email = emailInput.value;
  const password = passInput.value;

  if (!email || !password) {
    alert("Please fill out all fields.");
    return;
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log('User logged in:', user);

    // Fetch the user's role from the database
    const userRef = ref(db, 'users/' + user.uid + '/role');
    const snapshot = await get(userRef);
    
    if (snapshot.exists()) {
      const role = snapshot.val();
      // Clear the input fields
      emailInput.value = '';
      passInput.value = '';

      // Redirect based on role
      if (role === 'buyer') {
        window.location.href = '/buyerhome.html'; // Redirect to Buyer home
      } else if (role === 'seller') {
        window.location.href = '/sellerhome.html'; // Redirect to Seller home
      } else if (role === 'admin') {
        window.location.href = '/admindashboard.html'; // Redirect to Seller home
      } else {
        console.error('Unknown role:', role);
        alert('Unknown user role. Please contact support.');
      }
    } else {
      console.error('No role found for user');
      alert('No role found for the user. Please contact support.');
    }
  } catch (error) {
    console.error("Error logging in:", error);
    // Show the error modal
    const errorModal = new bootstrap.Modal(document.getElementById('errorModal'));
    errorModal.show();
    passInput.value = '';
  }
});

// Add event listener for forgot password link
forgotPasswordLink.addEventListener("click", (e) => {
  e.preventDefault();
  const email = emailInput.value;

  if (!email) {
    alert("Please enter your email address.");
    return;
  }

  sendPasswordResetEmail(auth, email)
    .then(() => {
      alert("A password reset link has been sent to your email!");
    })
    .catch((error) => {
      console.error("Error sending password reset email:", error);
      alert("Failed to send password reset email. Please try again.");
    });
});