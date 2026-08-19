import crypto from "crypto";

export default async function handler(req, res) {

    if (req.method !== "POST") {
        return res.status(405).json({
            error: "Método no permitido"
        });
    }

    try {

        const { modelo, titulo, valor } = req.body;

        if (!modelo || !valor) {
            return res.status(400).json({
                error: "Datos incompletos"
            });
        }

        // Wompi trabaja el valor en centavos
        const montoCentavos = Number(valor) * 100;

        if (!Number.isInteger(montoCentavos) || montoCentavos <= 0) {
            return res.status(400).json({
                error: "Valor inválido"
            });
        }

        // Referencia única
        const referencia =
            `DE-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

        // Moneda
        const moneda = "COP";

        // Firma de integridad
        const cadena =
            `${referencia}${montoCentavos}${moneda}${process.env.WOMPI_INTEGRITY_SECRET}`;

        const firma = crypto
            .createHash("sha256")
            .update(cadena)
            .digest("hex");

        console.log("WOMPI DEBUG TEST");
        console.log({
            publicKey: process.env.WOMPI_PUBLIC_KEY,
            secretExiste: !!process.env.WOMPI_INTEGRITY_SECRET,
            secretInicio: process.env.WOMPI_INTEGRITY_SECRET?.substring(0, 14),
            secretLongitud: process.env.WOMPI_INTEGRITY_SECRET?.length,
            referencia,
            montoCentavos,
            moneda,
            firma
        });

        console.log("WOMPI DEBUG:", {
            publicKey: process.env.WOMPI_PUBLIC_KEY,
            secretExiste: !!process.env.WOMPI_INTEGRITY_SECRET,
            secretInicio: process.env.WOMPI_INTEGRITY_SECRET?.substring(0, 14),
            secretLongitud: process.env.WOMPI_INTEGRITY_SECRET?.length,
            referencia,
            montoCentavos,
            moneda,
            cadenaLongitud: cadena.length,
            firma
        });

        return res.status(200).json({
            publicKey: process.env.WOMPI_PUBLIC_KEY,
            referencia,
            montoCentavos,
            moneda,
            firma,
            modelo,
            titulo,
            descripcion:
                `Servicio tecnico para recuperación de televisor modelo: ${modelo}.`
        });

    } catch (error) {

        console.error("Error creando transacción Wompi:", error);

        return res.status(500).json({
            error: "Error creando transacción Wompi"
        });
    }
}