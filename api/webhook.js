export default async function handler(req, res) {

    console.log("====================================");
    console.log("WEBHOOK MERCADO PAGO");
    console.log("Fecha:", new Date().toISOString());
    console.log("Método:", req.method);
    console.log("Query:", req.query);
    console.log("Body:", req.body);
    console.log("====================================");

    return res.status(200).json({
        received: true
    });

}