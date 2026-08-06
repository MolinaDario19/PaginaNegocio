export default async function handler(req, res) {

    console.log("====================================");
    console.log("WEBHOOK RECIBIDO");
    console.log("Método:", req.method);
    console.log("Body:", req.body);
    console.log("Query:", req.query);
    console.log("====================================");

    return res.status(200).json({
        ok: true
    });

}