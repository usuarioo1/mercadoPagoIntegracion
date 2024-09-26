import express from 'express'
import cors from 'cors'
import { configDotenv } from 'dotenv'

import {MercadoPagoConfig, Preference} from 'mercadopago'

const dotenv = configDotenv();

const client = new MercadoPagoConfig({
    accessToken:process.env.ACCESS_TOKEN,
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
                success:"https://www.youtube.com/watch?v=-VD-l5BQsuE&t=2078s",
                failure:"https://www.google.com/search?q=fail&newwindow=1&client=firefox-b-d&sca_esv=ea88a6ae473de4d9&sca_upv=1&udm=2&sxsrf=ADLYWIIQXjgFisaA_SwuK7XW9I9Abtrvlg:1727308570497&source=lnms&sa=X&ved=2ahUKEwiw5Yvupd-IAxUxLbkGHfU7DLIQ_AUoAXoECAUQAw&biw=1920&bih=919#vhid=57TkE9hwj3pVrM&vssid=mosaic",
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

