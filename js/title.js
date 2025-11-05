// Generar partículas flotantes
const particlesContainer = document.getElementById('particles');
const particleCount = 30;

for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.left = Math.random() * 100 + '%';
    particle.style.animationDelay = Math.random() * 15 + 's';
    particle.style.animationDuration = (15 + Math.random() * 10) + 's';
    particlesContainer.appendChild(particle);
}

// Efecto parallax suave al mover el mouse
document.addEventListener('mousemove', (e) => {
    const moveX = (e.clientX - window.innerWidth / 2) * 0.01;
    const moveY = (e.clientY - window.innerHeight / 2) * 0.01;
            
    document.querySelectorAll('.glow-orb').forEach((orb, index) => {
        const speed = (index + 1) * 0.5;
        orb.style.transform = `translate(${moveX * speed}px, ${moveY * speed}px)`;
    });
});