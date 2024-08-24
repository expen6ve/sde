document.addEventListener('DOMContentLoaded', function () {
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
});
