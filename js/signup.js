// Import Firebase SDK functions
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";
import { getAuth, createUserWithEmailAndPassword, sendEmailVerification, signOut } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js";
import { checkAuth } from "./auth.js";

// Firebase configuration and initialization
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
const auth = getAuth(app);
const storage = getStorage(app);

// Element references
const formElements = {
    email: document.getElementById("email"),
    password: document.getElementById("password"),
    firstName: document.getElementById("first-name"),
    lastName: document.getElementById("last-name"),
    dateDay: document.getElementById('user-day'),
    dateMonth: document.getElementById('user-month'),
    dateYear: document.getElementById('user-year'),
    gender: document.getElementsByName("gender"),
    phone: document.getElementById("phone-number"),
    address: {
        street: document.getElementById("street"),
        barangay: document.getElementById("barangay"),
        zipCode: document.getElementById("zip-code"),
        city: document.getElementById("city"),
        province: document.getElementById("province"),
    },
    termsCheckbox: document.getElementById("terms"),
    profilePicture: document.getElementById("profilePicture"),
    profilePreview: document.getElementById("profilePreview"),
    registerButton: document.querySelector("button[type='submit']"),
    continueButton: document.getElementById("continueButton"),
    goBackButton: document.getElementById("goBackButton"),
};

// Check if user is already logged in
checkAuth().then((user) => {
    if (user) window.location.href = "userhome.html"; 
});

// Helper functions
const getFormData = () => ({
    email: formElements.email.value,
    password: formElements.password.value,
    firstName: formElements.firstName.value,
    lastName: formElements.lastName.value,
    birthDate: {
        day: formElements.dateDay.value,
        month: formElements.dateMonth.value,
        year: formElements.dateYear.value,
    },
    gender: Array.from(formElements.gender).find(g => g.checked)?.value || null,
    phone: formElements.phone.value,
    address: {
        street: formElements.address.street.value,
        barangay: formElements.address.barangay.value,
        zipCode: formElements.address.zipCode.value,
        city: formElements.address.city.value,
        province: formElements.address.province.value,
    },
    // Do not include age here as it is dynamically calculated
});

// Calculate age based on the birthdate
const calculateAge = () => {
    const day = parseInt(formElements.dateDay.value);
    const month = parseInt(formElements.dateMonth.value) - 1; // Month is 0-indexed
    const year = parseInt(formElements.dateYear.value);

    if (!day || !month || !year) {
        return;
    }

    const birthDate = new Date(year, month, day);
    const today = new Date();

    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();

    // Adjust age if the current date is before the birthday
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }

    // Return the calculated age (do not attempt to set it in the DOM since the field is removed)
    return age;
};

// Event listener to calculate age when birthdate is updated
formElements.dateDay.addEventListener("change", () => {
    const age = calculateAge();
    console.log("Age: ", age); // Log to check the calculated age
});
formElements.dateMonth.addEventListener("change", () => {
    const age = calculateAge();
    console.log("Age: ", age); // Log to check the calculated age
});
formElements.dateYear.addEventListener("change", () => {
    const age = calculateAge();
    console.log("Age: ", age); // Log to check the calculated age
});

// Upload profile picture to Firebase Storage
const uploadProfilePicture = async (userId, file) => {
    if (!file) return null;
    const storagePath = `profilePictures/${userId}/${file.name}`;
    const imageRef = storageRef(storage, storagePath);
    await uploadBytes(imageRef, file);
    return await getDownloadURL(imageRef);
};

// Save user data to Firebase
const saveUserData = (userId, data) => {
    const userRef = ref(database, `users/${userId}`);
    const userWithRole = {
        ...data,
        role: 'buyer'  // Assign default "buyer" role
    };
    return set(userRef, userWithRole);
};

// Event Listeners for registration
formElements.registerButton.addEventListener("click", async (e) => {
    e.preventDefault();
    if (!formElements.termsCheckbox.checked) return alert("You must accept the terms and conditions to register.");
    if (!formElements.email.value || !formElements.password.value || !formElements.firstName.value || !formElements.lastName.value) {
        return alert("Please fill out all required fields.");
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, formElements.email.value, formElements.password.value);
        const user = userCredential.user;

        sendEmailVerification(user)
            .then(() => console.log("Verification email sent. Please verify to complete registration."))
            .catch(error => console.error("Error sending email verification:", error));

        // Upload profile picture and get the URL
        const profilePictureUrl = await uploadProfilePicture(user.uid, formElements.profilePicture.files[0]);

        // Save user data including the default "buyer" role and dynamic age
        const userData = { ...getFormData(), age: calculateAge(), profilePicture: profilePictureUrl };
        await saveUserData(user.uid, userData);

        // Show success modal and log the user out for verification
        $('#successModal').modal('show');
        await signOut(auth);
    } catch (error) {
        console.error("Error registering user:", error);
        alert(error.message);
    }
});

// Redirect to login on button click
formElements.goBackButton.addEventListener("click", () => window.location.href = "login.html");
formElements.continueButton.addEventListener("click", () => window.location.href = "login.html");

// Profile picture preview
formElements.profilePicture.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = () => formElements.profilePreview.src = reader.result;
        reader.readAsDataURL(file);
    }
});
