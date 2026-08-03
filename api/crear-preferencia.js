import { MercadoPagoConfig, Preference } from "mercadopago";

const client = new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN_PRO
});

export default async function handler(req, res) {

    if (req.method !== "POST") {
        return res.status(405).json({
            error: "Método no permitido"
        });
    }

    try {

        const { modelo, valor } = req.body;

        if (!modelo || !valor) {
            return res.status(400).json({
                error: "Datos incompletos"
            });
        }

        const preference = new Preference(client);

        const resultado = await preference.create({
            body: {
                items: [
                    {
                        title: modelo,
                        quantity: 1,
                        unit_price: Number(valor),
                        currency_id: "COP"
                    }
                ],

                back_urls: {
                    success: "https://digitalelectronics.com.co/payment.html",
                    failure: "https://digitalelectronics.com.co/payment.html",
                    pending: "https://digitalelectronics.com.co/payment.html"
                },

                auto_return: "approved"
            }
        });


        return res.status(200).json({
            preference_id: resultado.id
        });


    } catch (error) {

        console.error("Error Mercado Pago:", error);

        return res.status(500).json({
            error: "Error creando preferencia"
        });
    }
}