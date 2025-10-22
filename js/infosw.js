const buttons = document.querySelectorAll('.sistemas-tab-button');
const panes = document.querySelectorAll('.sistemas-tab-pane');

buttons.forEach(button => {
button.addEventListener('click', () => {
    // Remover clases activas
    buttons.forEach(btn => btn.classList.remove('software_active'));
    panes.forEach(pane => pane.classList.remove('software_active'));

    // Activar el botón y panel correspondiente
    const target = button.getAttribute('data-target');
    document.getElementById(target).classList.add('software_active');
    button.classList.add('software_active');
});
});

