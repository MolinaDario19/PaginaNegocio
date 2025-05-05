function actualizarHora() {
    const horaElemento = document.getElementById('hora');
    const ahora = new Date();
    const horas = ahora.getHours().toString().padStart(2, '0');
    const minutos = ahora.getMinutes().toString().padStart(2, '0');
    horaElemento.textContent = `${horas}:${minutos}`;
}
                
// Actualizar hora inmediatamente
actualizarHora();
                
// Actualizar cada segundo
setInterval(actualizarHora, 1000);



// Esperar a que el DOM cargue completamente
document.addEventListener("DOMContentLoaded", function () {
    var wha = document.getElementById("myWha");
    var openWhaBtn = document.getElementById("openWha");
    var closeWhaBtn = document.getElementsByClassName("closeWha")[0];

    // Abrir la ventana emergente solo cuando se haga clic en el enlace
    openWhaBtn.addEventListener("click", function (event) {
        event.preventDefault(); // Evita que el enlace recargue la página
        wha.style.display = "block";
    });

    // Cerrar la ventana emergente al hacer clic en la "X"
    closeWhaBtn.addEventListener("click", function () {
        wha.style.display = "none";
    });

    // Cerrar la ventana emergente si se hace clic fuera del contenido
    window.addEventListener("click", function (event) {
        if (event.target === wha) {
            wha.style.display = "none";
        }
    });
});
