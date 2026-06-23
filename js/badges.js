function rotateBadges() {
            const container = document.getElementById('trustBadges');
            const items = container.querySelectorAll('.badge-item');
            let currentIndex = 0;

            setInterval(() => {
                // Quitar clase activa al actual
                items[currentIndex].classList.remove('active');

                // Calcular siguiente índice
                currentIndex = (currentIndex + 1) % items.length;

                // Añadir clase activa al siguiente
                items[currentIndex].classList.add('active');
            }, 5000); // 5000ms = 5 segundos
        }

        // Iniciar rotación al cargar la página
        document.addEventListener('DOMContentLoaded', rotateBadges);