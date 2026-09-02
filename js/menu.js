(function() {
    const openButton = document.querySelector('.nav__menu');
    const menu = document.querySelector('.nav__link--menu') || document.querySelector('.nav__link');
    const closeMenu = document.querySelector('.nav__close');
    const navLinks = document.querySelectorAll('.nav__links');

    if (openButton && menu) {
        openButton.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.classList.add('nav__link--show');
        });
    }

    if (closeMenu && menu) {
        closeMenu.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.classList.remove('nav__link--show');
        });
    }

    if (menu) {
        // Cerrar al hacer clic en cualquier enlace
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                menu.classList.remove('nav__link--show');
            });
        });

        // Cerrar al hacer clic fuera del menú
        document.addEventListener('click', (e) => {
            if (!menu.contains(e.target) && !openButton?.contains(e.target)) {
                menu.classList.remove('nav__link--show');
            }
        });
    }
})();
