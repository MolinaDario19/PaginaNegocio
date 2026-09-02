const images = [];
const total = 72;

for (let i = 1; i <= total; i++) {
  images.push(`/img_sol/soft${i}.jpeg`);
}

const carousel = document.getElementById('carousel');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
let currentIndex = 0;

function createImg(src, className) {
  const img = document.createElement('img');
  img.src = src;
  img.className = className;
  img.alt = `Solución de software Smart TV ${currentIndex + 1}`;
  return img;
}

function renderCarousel() {
  if (!carousel) return;
  carousel.innerHTML = '';

  const prevIndex = (currentIndex - 1 + images.length) % images.length;
  const nextIndex = (currentIndex + 1) % images.length;

  const prevImg = createImg(images[prevIndex], 'prev');
  const currentImg = createImg(images[currentIndex], 'active');
  const nextImg = createImg(images[nextIndex], 'next');

  carousel.appendChild(prevImg);
  carousel.appendChild(currentImg);
  carousel.appendChild(nextImg);
}

if (prevBtn) {
  prevBtn.addEventListener('click', () => {
    currentIndex = (currentIndex - 1 + images.length) % images.length;
    renderCarousel();
  });
}

if (nextBtn) {
  nextBtn.addEventListener('click', () => {
    currentIndex = (currentIndex + 1) % images.length;
    renderCarousel();
  });
}

if (carousel) {
  renderCarousel();
}
