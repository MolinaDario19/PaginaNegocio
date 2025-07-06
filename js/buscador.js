
document.getElementById('buscador').addEventListener('input', function () {
    const filtro = this.value.toLowerCase();
    const modelos = document.querySelectorAll('#hyundaisw .modelo-link, #androidTV .modelo-link, #googleTV .modelo-link, #linuxTV .modelo-link');

    modelos.forEach(modelo => {
        const texto = modelo.dataset.modelo.toLowerCase();
        if (texto.includes(filtro)) {
            modelo.style.display = 'inline-block'; // o 'flex' si usas flexbox
        } else {
             modelo.style.display = 'none';
        }
    });
});

