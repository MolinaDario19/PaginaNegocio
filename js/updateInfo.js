let data;

// Cargar el archivo JSON
fetch('./info.json') 
  .then(res => res.json())
  .then(json => {
    data = json;

    // Agregar eventos a los enlaces
    document.querySelectorAll('.modelo-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const modelo = e.target.dataset.modelo;
        const info = data[modelo];

        if (info) {
          document.getElementById('modalTitulo').textContent = `Modelo: ${info.modelo}`;
          document.getElementById('modalVersion').textContent = info.version;
          document.getElementById('modalFecha').textContent = info.fecha;
          document.getElementById('modalDescripcion').textContent = info.descripcion;
          document.getElementById('modal').style.display = 'block';
        } else {
          alert('Información no disponible para este modelo.');
        }
      });
    });

    // Botón para cerrar modal
    document.getElementById('cerrarModal').onclick = () => {
      document.getElementById('modal').style.display = 'none';
    };
  });
