
document.getElementById('buscador').addEventListener('input', function () {
    const filtro = this.value.toLowerCase();
    const modelos = document.querySelectorAll(`
    #hyundaisw .modelo-link,
    #androidT2 .modelo-link,
    #googleTV .modelo-link,
    #netflixT2 .modelo-link,
    #smart .modelo-link,
    #seriess30 .modelo-link,
    #androidTV .modelo-link,
    #linuxTV .modelo-link
    `);


    modelos.forEach(modelo => {
        const texto = modelo.dataset.modelo.toLowerCase();
        if (texto.includes(filtro)) {
            modelo.style.display = 'inline-block'; // o 'flex' si usas flexbox
        } else {
             modelo.style.display = 'none';
        }
    });
});

