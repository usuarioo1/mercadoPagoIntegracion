import express from 'express'
import cors from 'cors'
import { configDotenv } from 'dotenv'
import axios from 'axios'


import {MercadoPagoConfig, Preference} from 'mercadopago'

const dotenv = configDotenv();

const client = new MercadoPagoConfig({
    accessToken:process.env.ACCESS_TOKEN
})

const app = express();
const port = 5000

app.use(cors());
app.use(express.json())

app.get('/', (req,res) => {
    res.send('servidor')
})


app.post('/create_preference',async(req,res)=> {
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
    external_reference: req.body.orderId, // Agregar el ID de la orden
    notification_url: "https://mercadopagointegracionap.onrender.com/webhook" // URL donde recibirás las notificaciones
};

        const preference = new Preference(client);
        const result = await preference.create({body});
        res.json({
            id:result.id
        })
    } catch (error) {
        res.status(500).json({
            error:'error al crear preferencia  '
        });
    }
} );

// Webhook endpoint para recibir notificaciones de Mercado Pago
app.post('/webhook', async (req, res) => {
    try {
        const { data } = req.body;
        
        // Solo procesamos notificaciones de pagos
        if (data.type === "payment") {
            const paymentId = data.id;
            
            // Obtener detalles del pago usando el SDK de Mercado Pago
            const payment = await client.payment.findById(paymentId);
            
            // Si el pago fue aprobado, actualizamos la orden
            if (payment.status === 'approved') {
                // Llamar al backend principal para actualizar el estado de la orden
                const response = await fetch(`${process.env.API_URL}/update_order_status`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        orderId: payment.external_reference,
                        mercadoPagoId: payment.id,
                        paymentStatus: payment.status
                    })
                });

                if (!response.ok) {
                    throw new Error('Error actualizando la orden');
                }
            }
        }

        res.status(200).send('OK');
    } catch (error) {
        console.error('Error en webhook:', error);
        res.status(500).json({ error: 'Error procesando webhook' });
    }
});

// Webhook endpoint para recibir notificaciones de Mercado Pago
app.post('/webhook', async (req, res) => {
    try {
        const { data } = req.body;
        
        // Solo procesamos notificaciones de pagos
        if (data.type === "payment") {
            const paymentId = data.id;
            
            // Obtener detalles del pago usando el SDK de Mercado Pago
            const payment = await client.payment.findById(paymentId);
            
            // Si el pago fue aprobado, actualizamos la orden
            if (payment.status === 'approved') {
                // Llamar al backend principal para actualizar el estado de la orden usando axios
                const response = await axios.post(`${process.env.API_URL}/update_order_status`, {
                    orderId: payment.external_reference,
                    mercadoPagoId: payment.id,
                    paymentStatus: payment.status
                });

                if (response.status !== 200) {
                    throw new Error('Error actualizando la orden');
                }
            }
        }

        res.status(200).send('OK');
    } catch (error) {
        console.error('Error en webhook:', error);
        res.status(500).json({ error: 'Error procesando webhook' });
    }
});

app.listen(port, () =>{
    console.log('servidor activo')
});;

