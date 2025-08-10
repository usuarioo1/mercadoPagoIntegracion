import express from 'express'
import cors from 'cors'
import { configDotenv } from 'dotenv'


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
            items:[
                {
                    title: req.body.title,
                    quantity: Number(req.body.quantity),
                    unit_price:Number(req.body.price),
                    currency_id:'CLP'
                },
            ],
            back_urls:{
                success:"https://artesaniaspachy.cl/pagoAprobado",
                failure:"https://artesaniaspachy.cl/pagoFallido",
                pending:""
            },
            auto_return:"approved"
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

app.listen(port, () =>{
    console.log('servidor activo')
})

