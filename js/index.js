document.addEventListener('DOMContentLoaded', function () {
    // Redirect to login page
    const myButton = document.getElementById('signinbutton');
    if (myButton) {
        myButton.addEventListener('click', function() {
            window.location.href = 'login.html';
        });
    }

    // Handle "Read More" and "Read Less" functionality
    const readMoreLinks = document.querySelectorAll('.read-more');
    readMoreLinks.forEach(link => {
        link.addEventListener('click', function () {
            const cardText = this.previousElementSibling;
            if (cardText.classList.contains('text-hidden')) {
                cardText.classList.remove('text-hidden');
                this.textContent = 'Read Less';
            } else {
                cardText.classList.add('text-hidden');
                this.textContent = 'Read More';
            }
        });
    });

    // Handle genre dropdown redirection
    const genreDropdownItems = document.querySelectorAll('#genreDropdown .dropdown-item');
    genreDropdownItems.forEach(item => {
        item.addEventListener('click', (event) => {
            event.preventDefault(); // Prevent default link behavior
            const selectedGenre = event.target.getAttribute('data-genre');
            if (selectedGenre) {
                window.location.href = `genre.html?genre=${encodeURIComponent(selectedGenre)}`;
            }
        });
    });
});
