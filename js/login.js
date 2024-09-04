import { checkAuth, auth, signInWithEmailAndPassword, sendPasswordResetEmail } from './auth.js';
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";

// Initialize Firebase services from auth.js
const db = getDatabase();  // You can still initialize the database here since it doesn't affect auth

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
        window.location.href = 'userhome.html'; 
      } else if (role === 'seller') {
        window.location.href = 'userhome.html'; 
      } else if (role === 'admin') {
        window.location.href = 'admindashboard.html'; // Redirect to Admin home
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

// Example usage of checkAuth (if you want to verify user status before login)
checkAuth().then((user) => {
  if (user) {
    window.location.href = 'userhome.html'; 
    console.log('User already logged in:', user);
    // Optionally redirect or take action if the user is already logged in
  } else {
    console.log('No user logged in, proceed with login process.');
  }
});
