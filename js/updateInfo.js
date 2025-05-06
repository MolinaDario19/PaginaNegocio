let data;

fetch('/info.json')  // Ajusta la ruta si es necesario
  .then(res => res.json())
  .then(json => {
    data = json;
    console.log(data);  // Verifica que los datos están correctos

    document.querySelectorAll('.modelo-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();  // Prevenir la acción por defecto del enlace

        const modelo = e.currentTarget.dataset.modelo; 
        const info = data[modelo];

        console.log(info);  // Verifica los datos del modelo

        if (info) {
          document.getElementById('modalTitulo').textContent = `Modelo: ${info.modelo}`;
          document.getElementById('modalVersion').textContent = info.version;
          document.getElementById('modalFecha').textContent = info.fecha;
          document.getElementById('modalDescripcion').textContent = info.descripcion;

          document.getElementById('modal').style.display = 'flex';  // Cambiar 'block' a 'flex'
        } else {
          alert('Información no disponible para este modelo.');
        }
      });
    });

    document.getElementById('cerrarModal').onclick = () => {
      document.getElementById('modal').style.display = 'none';  // Ocultar el modal
    };
  })
  .catch(error => {
    console.error('Error cargando el archivo JSON:', error);
  });
