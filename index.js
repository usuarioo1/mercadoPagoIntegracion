// server.js (o como lo llames)
import express from 'express';
import cors from 'cors';
import { configDotenv } from 'dotenv';
import fetch from 'node-fetch';
import { MercadoPagoConfig, Preference } from 'mercadopago';

configDotenv();

const client = new MercadoPagoConfig({
    accessToken: process.env.ACCESS_TOKEN
});

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Servidor de pagos activo');
});

// Crear preferencia de pago con carrito y cliente completos
app.post('/create_preference', async (req, res) => {
    try {
        const { nombre, email, telefono, rut, region, direccion, referencia, cartItems, total, costoEnvio } = req.body;

        if (!nombre || !email || !rut || !region || !direccion || !cartItems || !total || costoEnvio === undefined) {
            return res.status(400).json({ error: 'Faltan datos obligatorios' });
        }

        // Mapear items para Mercado Pago
        const mpItems = cartItems.map(item => ({
            title: item.name,
            quantity: item.quantity,
            unit_price: item.precio,
            currency_id: 'CLP'
        }));

        const body = {
            items: mpItems,
            back_urls: {
                success: "https://artesaniaspachy.cl/pagoAprobado",
                failure: "https://artesaniaspachy.cl/pagoFallido",
                pending: ""
            },
            auto_return: "approved"
        };

        const preference = new Preference(client);
        const result = await preference.create({ body });

        // Guardar la orden completa en backend principal con estado pendiente
        await fetch(`${process.env.API_URL}/save_order`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                nombre,
                email,
                telefono: telefono || '',
                rut,
                region,
                direccion,
                referencia: referencia || '',
                cartItems,
                total,
                costoEnvio,
                mercadoPagoId: result.id,
                status: "pendiente"
            })
        });

        res.json({ id: result.id });
    } catch (error) {
        console.error('Error en create_preference:', error);
        res.status(500).json({ error: 'Error al crear preferencia' });
    }
});

// Webhook para recibir notificaciones oficiales de Mercado Pago
app.post('/webhook/mercadopago', async (req, res) => {
    try {
        const { type, data } = req.body;

        if (type !== 'payment' || !data?.id) {
            return res.status(400).json({ error: 'Datos incorrectos en webhook' });
        }

        const paymentId = data.id;

        // Consultar el estado del pago en Mercado Pago
        const payment = await client.payment.findById(paymentId);

        if (!payment) {
            return res.status(404).json({ error: 'Pago no encontrado en Mercado Pago' });
        }

        const mercadoPagoId = payment.preference_id; // Para relacionar orden en DB
        const paymentStatus = payment.status; // 'approved', 'pending', 'rejected', etc.

        // Llamar backend principal para actualizar estado y descontar stock si aplica
        const response = await fetch(`${process.env.API_URL}/update_order_status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mercadoPagoId, paymentStatus })
        });

        if (!response.ok) {
            console.error('Error al actualizar orden desde webhook');
            return res.status(500).json({ error: 'Error al actualizar orden' });
        }

        res.status(200).send('Webhook recibido y procesado correctamente');
    } catch (error) {
        console.error('Error en webhook Mercado Pago:', error);
        res.status(500).send('Error en webhook');
    }
});

app.listen(port, () => {
    console.log(`Servidor de pagos activo en puerto ${port}`);
});
