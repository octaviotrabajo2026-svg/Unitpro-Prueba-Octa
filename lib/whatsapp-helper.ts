export async function sendWhatsAppNotification(
    to: string, 
    templateType: string, 
    variables: any,
    instanceName: string,
    customTemplate?: string,
    imageUrl?: string 
) {
    if (!instanceName) {
        console.warn("[WHATSAPP] No hay instancia configurada.");
        return { success: false, error: "Instancia no configurada" };
    }

    const cleanNumber = to.replace(/\D/g, ''); 
    let mensaje = "";

    // Función interna para procesar variables dinámicas {{variable}}
    const procesarPlantilla = (texto: string) => {
        return texto.replace(/{{(\w+)}}/g, (match, key) => {
            return variables[key] !== undefined ? String(variables[key]) : match;
        });
    };

    // 1. Determinar el contenido del mensaje
    if (customTemplate) {
        // Si el usuario definió un mensaje personalizado en el Editor, lo procesamos
        mensaje = procesarPlantilla(customTemplate);
    } else {
        // Fallback: Mensajes por defecto con formato enriquecido de WhatsApp (*negrita*)
        switch (templateType) {
            case 'deposit':
                mensaje = `¡Hola *${variables.cliente}*! 👋\n\nRecibimos tu solicitud para *${variables.servicio}* el día ${variables.fecha}.\n\nPara confirmar el turno, te pedimos una seña de *${variables.monto_senia}*.\n\n🏦 *Datos para transferencia:*\nAlias: ${variables.alias}\n\nPor favor, envíanos el comprobante por este medio. ¡Muchas gracias!`;
                break;
            case 'confirmation':
                mensaje = `¡Hola *${variables.cliente}*! ✅\n\nTe confirmamos que tu turno para *${variables.servicio}* el día ${variables.fecha} ha sido agendado con éxito.\n\n¡Te esperamos!`;
                break;
            case 'reminder':
                mensaje = `¡Hola *${variables.cliente}*! ⏰\n\nTe recordamos que tienes un turno para *${variables.servicio}* mañana a las ${variables.fecha}.\n\nPor favor, si no puedes asistir avísanos con anticipación. ¡Nos vemos!`;
                break;
            case 'cancellation':
                mensaje = `¡Hola *${variables.cliente}*! ❌\n\nTe informamos que tu turno para *${variables.servicio}* el día ${variables.fecha} ha sido cancelado.\n\nSi deseas reprogramar, por favor vuelve a contactarnos. ¡Saludos!`;
                break;
            
            default:
                mensaje = `Hola ${variables.cliente}, tienes una notificación de tu turno para ${variables.servicio}.`;
        }
    }

    try {
        const apiUrl = process.env.EVOLUTION_API_URL?.replace(/\/$/, '');
        const apiKey = process.env.EVOLUTION_API_KEY;

        // 2. Determinar endpoint y estructura del body según si hay imagen o no
        const endpoint = imageUrl ? 'sendMedia' : 'sendText';
        
        const requestBody = imageUrl ? {
            number: cleanNumber,
            media: imageUrl,
            mediatype: "image",
            caption: mensaje, // El mensaje va como pie de foto
            delay: 1500
        } : {
            number: cleanNumber,
            text: mensaje,
            delay: 1500 
        };

        // 3. Llamada a la API de Evolution
        const response = await fetch(`${apiUrl}/message/${endpoint}/${instanceName}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': apiKey as string
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Error al enviar mensaje");
        }

        console.log(`✅ [WHATSAPP ENVIADO] a ${cleanNumber} (${templateType}) ${imageUrl ? 'con imagen' : ''}`);
        return { success: true };

    } catch (error: any) {
        console.error("❌ [ERROR WHATSAPP]:", error);
        return { success: false, error: error.message };
    }
}