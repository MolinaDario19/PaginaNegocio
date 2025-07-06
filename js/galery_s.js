const images = [];
const total = 6; // Puedes usar 100 o más

for (let i = 1; i <= total; i++) {
  images.push(`../img_sol/soft${i}.jpeg`);
}

const carousel = document.getElementById('carousel');
let currentIndex = 0;

function renderCarousel() {
  carousel.innerHTML = ''; // Limpiar

  const prevIndex = (currentIndex - 1 + images.length) % images.length;
  const nextIndex = (currentIndex + 1) % images.length;

  const prevImg = createImg(images[prevIndex], 'prev');
  const currentImg = createImg(images[currentIndex], 'active');
  const nextImg = createImg(images[nextIndex], 'next');

  carousel.appendChild(prevImg);
  carousel.appendChild(currentImg);
  carousel.appendChild(nextImg);
}

function createImg(src, className) {
  const img = document.createElement('img');
  img.src = src;
  img.className = className;
  return img;
}

// Eventos
document.getElementById('prevBtn').addEventListener('click', () => {
  currentIndex = (currentIndex - 1 + images.length) % images.length;
  renderCarousel();
});

document.getElementById('nextBtn').addEventListener('click', () => {
  currentIndex = (currentIndex + 1) % images.length;
  renderCarousel();
});

// Iniciar
renderCarousel();
