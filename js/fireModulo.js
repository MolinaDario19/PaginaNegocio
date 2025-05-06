import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";

export async function cargarColeccion(coleccion, documentoID, contenedores = {}) {
  try {
    const res = await fetch('/api/firebaseConfig');
    const firebaseConfig = await res.json();
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    const docRef = doc(db, coleccion, documentoID);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      console.log("Documento no encontrado");
      return;
    }

    const data = docSnap.data();

    // info.json
    const infoRes = await fetch('/info.json');
    const infoData = await infoRes.json();

    function crearCuadros(datos, contenedor) {
      contenedor.textContent = '';
      datos.forEach(item => {
        const a = document.createElement("a");
        a.className = "modelo-link";
        a.href = "#";
        a.dataset.modelo = item;

        const div = document.createElement("div");
        div.className = "cuadro";

        const icon = document.createElement("i");
        icon.className = "fas fa-folder icono-carpeta";

        const texto = document.createElement("span");
        texto.textContent = item;

        div.appendChild(icon);
        div.appendChild(texto);
        a.appendChild(div);
        contenedor.appendChild(a);
      });

      // infoData 
      document.querySelectorAll('.modelo-link').forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const modelo = e.currentTarget.dataset.modelo;
          const info = infoData[modelo];

          if (info) {
            document.getElementById('modalTitulo').textContent = `Modelo: ${info.modelo}`;
            document.getElementById('modalVersion').textContent = info.version || 'No disponible';
            document.getElementById('modalFecha').textContent = info.fecha || 'No disponible';
            document.getElementById('modalDescripcion').textContent = info.descripcion || 'No disponible';
            document.getElementById('modal').style.display = 'block';
          } else {
            alert('Información no disponible para este modelo.');
          }
        });
      });
    }

    for (const campo in contenedores) {
      if (data[campo]) {
        crearCuadros(data[campo], document.getElementById(contenedores[campo]));
      }
    }

  } catch (error) {
    console.error("Error general: ", error);
  }
}
