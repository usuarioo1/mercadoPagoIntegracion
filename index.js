import express from 'express'
import cors from 'cors'
import { configDotenv } from 'dotenv'
import axios from 'axios'

// CORRECCIÓN: Importar Payment también
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago'

const dotenv = configDotenv();

const client = new MercadoPagoConfig({
    accessToken: process.env.ACCESS_TOKEN
})

const app = express();
const port = 5000

app.use(cors());
app.use(express.json())

app.get('/', (req, res) => {
    res.send('servidor')
})

app.post('/create_preference', async (req, res) => {
    try {
        const body = {
            items: [
                {
                    title: req.body.title,
                    quantity: Number(req.body.quantity),
                    unit_price: Number(req.body.price),
                    currency_id: 'CLP'
                },
            ],
            back_urls: {
                success: "https://artesaniaspachy.cl/pagoAprobado",
                failure: "https://artesaniaspachy.cl/pagoFallido",
                pending: ""
            },
            auto_return: "approved",
            external_reference: req.body.orderId, // ID de la orden
            notification_url: "https://mercadopagointegracionap.onrender.com/webhook"
        };

        const preference = new Preference(client);
        const result = await preference.create({ body });
        res.json({
            id: result.id
        })
    } catch (error) {
        console.error('Error al crear preferencia:', error);
        res.status(500).json({
            error: 'error al crear preferencia'
        });
    }
});

// Webhook endpoint corregido para recibir notificaciones de Mercado Pago
app.post('/webhook', async (req, res) => {
    try {
        console.log('Webhook recibido:', req.body);
        const { data } = req.body;
        
        if (data && data.id && (data.type === "payment" || req.body.type === "payment")) {
            const paymentId = data.id;
            console.log('Payment ID:', paymentId);
            
            // CORRECCIÓN: Usar la clase Payment correctamente
            const payment = new Payment(client);
            
            try {
                // Obtener los detalles del pago
                const paymentData = await payment.get({ id: paymentId });
                console.log('Detalles del pago:', paymentData);

                if (paymentData && paymentData.status === 'approved') {
                    console.log('Pago aprobado, procesando orden...');
                    console.log('External reference (Order ID):', paymentData.external_reference);
                    
                    // Validar que tenemos el external_reference
                    if (!paymentData.external_reference) {
                        console.error('External reference no encontrado en el pago');
                        return res.status(200).send('OK - Sin external reference');
                    }
                    
                    // Llamar al backend principal para actualizar la orden y descontar stock
                    const response = await axios.post('https://apback.onrender.com/update_order_status', {
                        orderId: paymentData.external_reference,
                        mercadoPagoId: paymentData.id,
                        paymentStatus: paymentData.status
                    }, {
                        timeout: 15000, // 15 segundos de timeout
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    console.log('Respuesta backend principal:', response.data);

                    if (response.status !== 200) {
                        throw new Error(`Error actualizando la orden: ${response.status}`);
                    }
                } else {
                    console.log('Pago no aprobado o datos incompletos. Status:', paymentData?.status);
                }
            } catch (paymentError) {
                console.error('Error obteniendo detalles del pago:', paymentError);
                // Aún enviamos respuesta OK para evitar reintento infinito de webhook
                return res.status(200).send('OK - Error en pago pero webhook procesado');
            }
        } else {
            console.log('Webhook no es de tipo payment o faltan datos:', { 
                hasData: !!data, 
                dataId: data?.id, 
                dataType: data?.type, 
                bodyType: req.body.type 
            });
        }

        res.status(200).send('OK');
    } catch (error) {
        console.error('Error general en webhook:', error);
        res.status(500).json({ error: 'Error procesando webhook' });
    }
});

app.listen(port, () => {
    console.log('servidor activo en puerto', port)
});