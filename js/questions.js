(function() {
    const titleQuestions = document.querySelectorAll('.questions__title');

    titleQuestions.forEach(question => {
        question.addEventListener('click', () => {
            const article = question.closest('.questions__padding');
            const arrow = question.querySelector('.questions__arrow');

            if (article) {
                article.classList.toggle('questions__padding--add');
            }
            if (arrow) {
                arrow.classList.toggle('questions__arrow--rotate');
            }
        });
    });
})();
