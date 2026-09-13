export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: "Falta el parámetro id" });
  }

  try {
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
      headers: {
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN_PRO}`
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: "No se pudo obtener el pago" });
    }

    const payment = await response.json();

    return res.status(200).json({
      nombre: `${payment.payer?.first_name ?? ""} ${payment.payer?.last_name ?? ""}`.trim(),
      correo: payment.payer?.email ?? "",
      referencia: payment.external_reference ?? "",
      modelo: payment.metadata?.modelo ?? "",
      status: payment.status
    });
  } catch (err) {
    console.error("Error consultando pago:", err);
    return res.status(500).json({ error: "Error interno" });
  }
}