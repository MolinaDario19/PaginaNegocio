const buttons = document.querySelectorAll('.sistemas-tab-button');
const panes = document.querySelectorAll('.sistemas-tab-pane');
const tabContentContainer = document.querySelector('.sistemas-tab-content');

buttons.forEach(button => {
  button.addEventListener('click', () => {
    // Remover clases activas
    buttons.forEach(btn => btn.classList.remove('software_active'));
    panes.forEach(pane => pane.classList.remove('software_active'));

    // Agregar clase activa al botón y contenido correspondiente
    const target = button.getAttribute('data-target');
    button.classList.add('software_active');
    const activePane = document.getElementById(target);
    activePane.classList.add('software_active');

    // Mostrar contenedor solo si hay contenido activo
    if (activePane) {
      tabContentContainer.style.display = 'block';
    } else {
      tabContentContainer.style.display = 'none';
    }
  });
});

// Opcional: ocultar contenido al cargar la página
tabContentContainer.style.display = 'none';



