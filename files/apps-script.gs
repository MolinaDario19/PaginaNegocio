// ══════════════════════════════════════════════════════════════
//  POLÍTICA DE GARANTÍAS — Google Apps Script
//  Pega este código en: Google Sheets → Extensiones → Apps Script
// ══════════════════════════════════════════════════════════════

// ── CONFIGURA ESTOS DOS DATOS ──────────────────────────────────
const SHEET_NAME    = "Aceptaciones";          // Nombre de la hoja
const REMITENTE     = "Tu nombre o empresa";   // Aparece en el correo
// ──────────────────────────────────────────────────────────────

function doPost(e) {
  try {
    const data   = JSON.parse(e.postData.contents);
    const sheet  = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);

    // Si la hoja está vacía, crear encabezados
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["ID", "Timestamp", "Nombre", "Correo", "Teléfono", "Tipo Cliente", "Aceptación", "Fecha"]);
      sheet.getRange(1, 1, 1, 8).setFontWeight("bold").setBackground("#0F2440").setFontColor("#FFFFFF");
    }

    // Guardar fila
    sheet.appendRow([
      data.id,
      data.ts,
      data.name,
      data.email,
      data.phone,
      data.type,
      data.accepted ? "SÍ" : "NO",
      data.fechaTexto
    ]);

    // Enviar correo de confirmación al cliente
    enviarCorreoCliente(data);

    // Notificación interna (opcional — te llega a ti)
    enviarNotificacionInterna(data);

    return ContentService
      .createTextOutput(JSON.stringify({ status: "ok", id: data.id }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── CORREO AL CLIENTE ──────────────────────────────────────────
function enviarCorreoCliente(data) {
  const asunto = "✅ Confirmación de aceptación — Política de Garantías";

  const esHtml = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7F4EE;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F4EE;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- HEADER -->
        <tr>
          <td style="background:#0F2440;padding:32px 40px;text-align:center;">
            <div style="width:48px;height:48px;background:#E8A020;border-radius:10px;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:bold;color:#0F2440;line-height:48px;">IE</div>
            <h1 style="color:#ffffff;font-size:22px;margin:0 0 6px;font-weight:700;">Aceptación Registrada</h1>
            <p style="color:rgba(255,255,255,0.6);font-size:14px;margin:0;">Política de Garantías — Servicios de Ingeniería</p>
          </td>
        </tr>

        <!-- CUERPO -->
        <tr>
          <td style="padding:36px 40px;">
            <p style="color:#1A1A2E;font-size:16px;margin:0 0 8px;">Hola, <strong>${data.name}</strong> 👋</p>
            <p style="color:#3D4A5C;font-size:14px;line-height:1.7;margin:0 0 28px;">
              Tu firma digital ha sido registrada exitosamente. A continuación encontrarás el resumen de tu aceptación.
            </p>

            <!-- RECIBO -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F4EE;border-radius:8px;overflow:hidden;margin-bottom:28px;">
              <tr style="border-bottom:1px solid #EDE9E0;">
                <td style="padding:12px 16px;font-size:12px;color:#6B7A8D;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;width:40%;">Código de registro</td>
                <td style="padding:12px 16px;font-size:12px;font-weight:700;color:#1E6FB5;font-family:monospace;">${data.id}</td>
              </tr>
              <tr style="border-bottom:1px solid #EDE9E0;">
                <td style="padding:12px 16px;font-size:12px;color:#6B7A8D;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Nombre</td>
                <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#1A1A2E;">${data.name}</td>
              </tr>
              <tr style="border-bottom:1px solid #EDE9E0;">
                <td style="padding:12px 16px;font-size:12px;color:#6B7A8D;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Correo</td>
                <td style="padding:12px 16px;font-size:13px;color:#1A1A2E;">${data.email}</td>
              </tr>
              <tr style="border-bottom:1px solid #EDE9E0;">
                <td style="padding:12px 16px;font-size:12px;color:#6B7A8D;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Teléfono</td>
                <td style="padding:12px 16px;font-size:13px;color:#1A1A2E;">${data.phone}</td>
              </tr>
              <tr style="border-bottom:1px solid #EDE9E0;">
                <td style="padding:12px 16px;font-size:12px;color:#6B7A8D;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Tipo de cliente</td>
                <td style="padding:12px 16px;">
                  <span style="background:${data.type==='Técnico'?'#EBF4FB':'#EDE9E0'};color:${data.type==='Técnico'?'#1E6FB5':'#6B7A8D'};font-size:11px;font-weight:700;padding:3px 10px;border-radius:100px;text-transform:uppercase;">
                    ${data.type}
                  </span>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 16px;font-size:12px;color:#6B7A8D;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Fecha y hora</td>
                <td style="padding:12px 16px;font-size:13px;color:#1A1A2E;">${data.fechaTexto}</td>
              </tr>
            </table>

            <!-- OPCIONES RECORDATORIO -->
            <p style="color:#1A1A2E;font-size:14px;font-weight:600;margin:0 0 12px;">Recuerda: en caso de necesitar garantía tienes dos opciones:</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td width="48%" style="background:#EBF4FB;border-left:4px solid #1E6FB5;border-radius:6px;padding:14px 16px;vertical-align:top;">
                  <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;color:#1E6FB5;">Opción A</p>
                  <p style="margin:0 0 4px;font-size:24px;font-weight:700;color:#1E6FB5;">50%</p>
                  <p style="margin:0;font-size:12px;color:#3D4A5C;">Devolución parcial con evidencia del no funcionamiento.</p>
                </td>
                <td width="4%"></td>
                <td width="48%" style="background:#E8F5EE;border-left:4px solid #1A6B3A;border-radius:6px;padding:14px 16px;vertical-align:top;">
                  <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;color:#1A6B3A;">Opción B${data.type!=='Técnico'?' (solo técnicos)':''}</p>
                  <p style="margin:0 0 4px;font-size:24px;font-weight:700;color:#1A6B3A;">60%</p>
                  <p style="margin:0;font-size:12px;color:#3D4A5C;">Bono de descuento en próximo servicio. Vigencia 90 días.</p>
                </td>
              </tr>
            </table>

            <p style="color:#3D4A5C;font-size:13px;line-height:1.7;margin:0;">
              Si tienes alguna duda o necesitas hacer uso de la garantía, responde este correo o contáctame directamente. Estaré atento.
            </p>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="background:#F7F4EE;border-top:1px solid #EDE9E0;padding:20px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#6B7A8D;">
              <strong>${REMITENTE}</strong> — Servicios de Ingeniería Electrónica y Software<br>
              Este es un correo automático de confirmación. Consérvalo para tus registros.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  GmailApp.sendEmail(data.email, asunto, "Tu aceptación fue registrada correctamente. Código: " + data.id, {
    htmlBody: esHtml,
    name: REMITENTE
  });
}

// ── NOTIFICACIÓN INTERNA (opcional) ───────────────────────────
function enviarNotificacionInterna(data) {
  const yo = Session.getActiveUser().getEmail();
  const asunto = `📋 Nueva aceptación: ${data.name} (${data.type})`;
  const cuerpo = `
Nuevo cliente registró la aceptación de la política de garantías.

Código:       ${data.id}
Nombre:       ${data.name}
Correo:       ${data.email}
Teléfono:     ${data.phone}
Tipo:         ${data.type}
Fecha:        ${data.fechaTexto}

Revisar en Google Sheets.
  `;
  GmailApp.sendEmail(yo, asunto, cuerpo, { name: "Sistema de Garantías" });
}

// ── TEST MANUAL (ejecuta desde Apps Script para probar) ────────
function testManual() {
  const dataPrueba = {
    id: "GR-TEST-0001",
    ts: Date.now(),
    name: "Cliente de Prueba",
    email: Session.getActiveUser().getEmail(), // Te lo manda a ti para probar
    phone: "3001234567",
    type: "Técnico",
    accepted: true,
    fechaTexto: new Date().toLocaleString('es-CO')
  };
  enviarCorreoCliente(dataPrueba);
  Logger.log("Correo de prueba enviado a: " + dataPrueba.email);
}
