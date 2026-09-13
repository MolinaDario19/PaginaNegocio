// ============================================================
// payment.js
// Lógica de la página de confirmación de pago:
//  - Detecta el resultado que envía Mercado Pago en la URL
//  - Si el pago fue aprobado, autorrellena el formulario
//  - Si fue rechazado o está pendiente, muestra un aviso
//  - Maneja el envío de la confirmación por WhatsApp
// ============================================================

async function precargarDatosPago() {
  const params = new URLSearchParams(window.location.search);
  const paymentId = params.get("payment_id") || params.get("collection_id");
  const status = params.get("status") || params.get("collection_status");

  if (!paymentId) return; // el cliente llegó sin datos de MP, formulario vacío normal

  if (status === "rejected") {
    mostrarEstado(
      "rejected",
      "Tu pago no pudo procesarse",
      "Verifica los datos de tu método de pago o intenta con otro. Si el problema persiste, contáctanos por WhatsApp."
    );
    return; // no consultamos la API, no hay nada que autorrellenar
  }

  if (status === "pending") {
    mostrarEstado(
      "pending",
      "Tu pago está en proceso",
      "Algunos métodos (como transferencia bancaria) tardan en confirmarse. Te avisaremos apenas se acredite."
    );
    return;
  }

  if (status !== "approved") return; // estado desconocido, no hacemos nada

  // Evita volver a consultar la API si el usuario recarga la misma página
  const yaConsultado = sessionStorage.getItem(`mp_${paymentId}`);
  if (yaConsultado) {
    rellenarCampos(JSON.parse(yaConsultado));
    return;
  }

  try {
    const res = await fetch(`/api/payment-info?id=${paymentId}`);
    if (!res.ok) return;

    const data = await res.json();
    sessionStorage.setItem(`mp_${paymentId}`, JSON.stringify(data));
    rellenarCampos(data);
  } catch (err) {
    console.error("No se pudieron precargar los datos:", err);
  }
}

function rellenarCampos(data) {
  if (data.nombre)     document.getElementById("nombre").value = data.nombre;
  if (data.correo)     document.getElementById("correo").value = data.correo;
  if (data.referencia) document.getElementById("referencia").value = data.referencia;
  if (data.modelo)     document.getElementById("modelo").value = data.modelo;
}

function mostrarEstado(tipo, titulo, mensaje) {
  const contenedor = document.getElementById("estadoPago");
  if (!contenedor) return;

  contenedor.innerHTML = `
    <div class="estado-pago estado-pago--${tipo}">
      <strong>${titulo}</strong>
      <p>${mensaje}</p>
    </div>
  `;
  contenedor.scrollIntoView({ behavior: "smooth", block: "start" });
}

function enviarWhatsApp() {
  const nombre = document.getElementById("nombre").value.trim();
  const correo = document.getElementById("correo").value.trim();
  const referencia = document.getElementById("referencia").value.trim();
  const modelo = document.getElementById("modelo").value.trim();
  const serie = document.getElementById("serie").value.trim();

  if (!correo || !referencia || !modelo) {
    alert("Por favor llena todos los campos.");
    return;
  }

  const mensaje = `Hola, confirmo que he realizado el pago.\n\n*Nombre:* ${nombre}\n*Correo:* ${correo}\n*Referencia de pago:* ${referencia}\n*Modelo TV:* ${modelo}\n*Número de serie TV:* ${serie}`;

  const numeroDestino = "573103841388";
  const url = `https://wa.me/${numeroDestino}?text=${encodeURIComponent(mensaje)}`;

  window.open(url, "_blank");
}

document.addEventListener("DOMContentLoaded", precargarDatosPago);