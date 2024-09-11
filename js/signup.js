// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js";

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
const database = getDatabase(app);
const auth = getAuth(app);
const storage = getStorage(app);

// Get form references
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const firstNameInput = document.getElementById("first-name");
const lastNameInput = document.getElementById("last-name");
const dateDayInput = document.getElementById('user-day')
const dateMonthInput = document.getElementById('user-month')
const dateYearInput = document.getElementById('user-year')
const ageInput = document.getElementById("age");
const genderInputs = document.getElementsByName("gender");
const phoneInput = document.getElementById("phone-number");
const streetInput = document.getElementById("street");
const barangayInput = document.getElementById("barangay");
const zipCodeInput = document.getElementById("zip-code");
const cityInput = document.getElementById("city");
const provinceInput = document.getElementById("province");
const termsCheckbox = document.getElementById("terms");
const registerButton = document.querySelector("button[type='submit']");
const continueButton = document.getElementById("continueButton");
const profilePictureInput = document.getElementById("profilePicture");
const profilePreview = document.getElementById("profilePreview");

// Register event listener for form submission
registerButton.addEventListener("click", (e) => {
    e.preventDefault(); // Prevent default form submission

    if (!termsCheckbox.checked) {
        alert("You must accept the terms and conditions to register.");
        return;
    }

    const email = emailInput.value;
    const password = passwordInput.value;

    // Ensure the form fields are not empty
    if (!email || !password || !firstNameInput.value || !lastNameInput.value) {
        alert("Please fill out all required fields.");
        return;
    }

    // Create a new user
    createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
        // Signed in successfully
        const user = userCredential.user;

        // Handle profile picture upload
        const file = profilePictureInput.files[0];
        let profilePictureUrl = null;

        if (file) {
            const storagePath = `profilePictures/${user.uid}/${file.name}`;
            const imageRef = storageRef(storage, storagePath);

            uploadBytes(imageRef, file).then(() => {
                getDownloadURL(imageRef).then((url) => {
                    profilePictureUrl = url;
                    // Save additional user information to the database
                    set(ref(database, 'users/' + user.uid), {
                        firstName: firstNameInput.value,
                        lastName: lastNameInput.value,
                        birthDate: {
                            dateDay: dateDayInput.value,
                            dateMonth: dateMonthInput.value,
                            dateYear: dateYearInput.value,
                        },
                        age: ageInput.value,
                        gender: getSelectedGender(),
                        phone: phoneInput.value,
                        address: {
                            street: streetInput.value,
                            barangay: barangayInput.value,
                            zipCode: zipCodeInput.value,
                            city: cityInput.value,
                            province: provinceInput.value
                        },
                        profilePicture: profilePictureUrl
                    }).then(() => {
                        // Show the modal on successful registration
                        $('#successModal').modal('show');
                    });
                });
            }).catch((error) => {
                console.error("Error uploading profile picture:", error);
            });
        } else {
            // Save user data without profile picture
            set(ref(database, 'users/' + user.uid), {
                firstName: firstNameInput.value,
                lastName: lastNameInput.value,
                birthDate: {
                    dateDay: dateDayInput.value,
                    dateMonth: dateMonthInput.value,
                    dateYear: dateYearInput.value,
                },
                age: ageInput.value,
                gender: getSelectedGender(),
                phone: phoneInput.value,
                address: {
                    street: streetInput.value,
                    barangay: barangayInput.value,
                    zipCode: zipCodeInput.value,
                    city: cityInput.value,
                    province: provinceInput.value
                }
            }).then(() => {
                // Show the modal on successful registration
                $('#successModal').modal('show');
            });
        }
    })
    .catch((error) => {
        console.error("Error registering user:", error);
        alert(error.message);
    });
});

// "Go Back" button reference
const goBackButton = document.getElementById("goBackButton");

// Redirect to login.html when the "Go Back" button is clicked
goBackButton.addEventListener("click", () => {
    window.location.href = "login.html";
});

// Redirect to login.html when the "Continue" button is clicked
continueButton.addEventListener("click", () => {
    window.location.href = "landingpage.html";
});

// Function to get the selected gender
function getSelectedGender() {
    for (const genderInput of genderInputs) {
        if (genderInput.checked) {
            return genderInput.value;
        }
    }
    return null;
}

// Display profile picture preview
profilePictureInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = () => {
            profilePreview.src = reader.result;
        };
        reader.readAsDataURL(file);
    }
});