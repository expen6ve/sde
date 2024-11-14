import { auth, signInWithEmailAndPassword, sendPasswordResetEmail } from './auth.js';

// Get references to the elements
const emailInput = document.getElementById("emailInput");
const passInput = document.getElementById("passInput");
const loginButton = document.getElementById("loginButton");
const forgotPasswordLink = document.querySelector('a[href="#"]');

// Function to show error modal
function showErrorModal(message) {
  const errorModal = new bootstrap.Modal(document.getElementById('errorModal'));
  document.querySelector('#errorModal .modal-body').textContent = message;
  errorModal.show();
}

loginButton.addEventListener("click", async (e) => {
  e.preventDefault();

  const email = emailInput.value;
  const password = passInput.value;

  if (!email || !password) {
    showErrorModal("Please fill out all fields.");
    return;
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Check if the user's email is verified
    if (!user.emailVerified) {
      showErrorModal("Please verify your email before logging in.");
      return;
    }

    // Redirect based on role (assuming some role check is needed)
    window.location.href = 'userhome.html';
  } catch (error) {
    console.error("Error logging in:", error);
    showErrorModal("There was an error with your login attempt. Please try again.");
    passInput.value = '';
  }
});

// Open Forgot Password modal when the link is clicked
forgotPasswordLink.addEventListener("click", (e) => {
  e.preventDefault();
  const forgotPasswordModal = new bootstrap.Modal(document.getElementById('forgotPasswordModal'));
  forgotPasswordModal.show();
});

// Handle Forgot Password functionality
document.getElementById('forgotPasswordContinueButton').addEventListener('click', () => {
  const email = document.getElementById('forgotPasswordEmailInput').value;

  if (!email) {
    showErrorModal("Please enter your email address.");
    return;
  }

  sendPasswordResetEmail(auth, email)
    .then(() => {
      alert("A password reset link has been sent to your email.");
      const forgotPasswordModal = bootstrap.Modal.getInstance(document.getElementById('forgotPasswordModal'));
      forgotPasswordModal.hide();
    })
    .catch((error) => {
      console.error("Error sending password reset email:", error);
      showErrorModal("Failed to send password reset email. Please try again.");
    });
});
