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
    age: document.getElementById("age"),
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
    age: formElements.age.value,
    gender: Array.from(formElements.gender).find(g => g.checked)?.value || null,
    phone: formElements.phone.value,
    address: {
        street: formElements.address.street.value,
        barangay: formElements.address.barangay.value,
        zipCode: formElements.address.zipCode.value,
        city: formElements.address.city.value,
        province: formElements.address.province.value,
    },
});

const uploadProfilePicture = async (userId, file) => {
    if (!file) return null;
    const storagePath = `profilePictures/${userId}/${file.name}`;
    const imageRef = storageRef(storage, storagePath);
    await uploadBytes(imageRef, file);
    return await getDownloadURL(imageRef);
};

const saveUserData = (userId, data) => {
    const userRef = ref(database, `users/${userId}`);
    return set(userRef, data);
};

// Event Listeners
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

        const profilePictureUrl = await uploadProfilePicture(user.uid, formElements.profilePicture.files[0]);
        const userData = { ...getFormData(), profilePicture: profilePictureUrl };
        await saveUserData(user.uid, userData);

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
