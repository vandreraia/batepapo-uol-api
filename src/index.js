import express, { json } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient } from "mongodb";
import dayjs from 'dayjs';
import { Console } from 'console';

dotenv.config();

const server = express();
server.use(cors());
server.use(json());

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;

mongoClient.connect().then(() => {
    db = mongoClient.db("batepapo-UOL");
});

server.get('/participants', (req, res) => {
    db.collection("participants").find().toArray()
        .then(participants => {
            res.send(participants);
        })
        .catch(() => res.sendStatus(500));
});


server.post('/participants', async (req, res) => {

    if (!req.body.name) {
        res.status(422).send("Todos os campos são obrigatórios!");
        return;
    }

    try {
        const participant = await db.collection("participants").find({ name: req.body.name }).toArray()
    
        console.log(participant);
        if (participant) {
            res.status(409).send("Usuario ja existe!");
            return;
        }
    } catch (error) {
        res.status(500).send("erro ao procurar participante na database");
    }

    db.collection("participants").insertOne({
        name: req.body.name,
        lastStatus: Date.now()
    });

    db.collection("messages").insertOne({
        from: req.body.name,
        to: "Todos",
        text: 'entra na sala...',
        type: "status",
        time: `${dayjs().hour()}:${dayjs().minute()}:${dayjs().second()}`
    })

    res.sendStatus(201);
})

server.get("/messages", (req, res) => {
    db.collection("messages").find.toArray()
        .then(messages => {
            res.send(messages);
        })
        .catch(() => res.sendStatus(500));
})

server.post("/messages", (req, res) => {

    if (!req.headers.user || !req.body.to || req.body.text || req.body.type) {
        res.sendStatus(422);
        return;
    }
    db.collection("messages").insertOne({
        from: req.headers.user,
        to: req.body.to,
        text: req.body.text,
        type: req.body.type,
        time: `${dayjs().hour()}:${dayjs().minute()}:${dayjs().second()}`
    })
    res.sendStatus(201);
})

server.listen(5000, () => {
    console.log("Rodando em http://localhost:5000");
});