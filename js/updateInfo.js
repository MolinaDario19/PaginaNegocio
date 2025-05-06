let data;

// Cargar el archivo JSON
fetch('/info.json')  // Asegúrate de que la ruta sea correcta
  .then(res => {
    if (!res.ok) {
      throw new Error('Error al cargar el archivo JSON');
    }
    return res.json();
  })
  .then(json => {
    data = json;

    // Asegurémonos de que los enlaces se están seleccionando correctamente
    const enlaces = document.querySelectorAll('.modelo-link');
    console.log('Enlaces encontrados:', enlaces);

    // Agregar eventos a los enlaces
    enlaces.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();  // Prevenir la acción por defecto del enlace
        console.log('Enlace clickeado', e.target.closest('.modelo-link')); // Log cuando se hace clic

        // Obtener el 'data-modelo' del enlace
        const modelo = e.target.closest('.modelo-link').dataset.modelo;
        const info = data[modelo];  // Buscar el modelo en el JSON

        if (info) {
          // Mostrar la información en el modal
          document.getElementById('modalTitulo').textContent = `Modelo: ${info.modelo}`;
          document.getElementById('modalVersion').textContent = info.version || 'No disponible';
          document.getElementById('modalFecha').textContent = info.fecha || 'No disponible';
          document.getElementById('modalDescripcion').textContent = info.descripcion || 'No disponible';

          // Mostrar el modal
          document.getElementById('modal').style.display = 'block';
        } else {
          alert('Información no disponible para este modelo.');
        }
      });
    });

    // Botón para cerrar el modal
    document.getElementById('cerrarModal').onclick = () => {
      document.getElementById('modal').style.display = 'none';
    };
  })
  .catch(error => {
    console.error('Error cargando el archivo JSON:', error);
  });
