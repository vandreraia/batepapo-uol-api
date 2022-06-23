import express, { json } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient, ObjectId } from "mongodb";
import dayjs from 'dayjs';

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
        const participant = await db.collection("participants").find({ name: req.body.name }).toArray();

        if (participant.some(e => e.name === req.body.name)) {
            res.status(409).send("Usuario ja existe!");
            return;
        }
    } catch (error) {
        res.status(500).send("erro ao procurar participante na database");
        return;
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
    let limit = parseInt(req.query.limit);

    if (!limit) {
        limit = 100;
    }
    db.collection("messages").find().toArray()
        .then(messages => {
            res.send(messages.slice(-limit));
        })
        .catch(() => res.sendStatus(500));
})

server.post("/messages", (req, res) => {

    if (!req.headers.user || !req.body.to || !req.body.text || !req.body.type) {
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

server.delete("/messages/:id", async (req, res) => {
    const { id } = req.params;
    const { user } = req.headers;

    const messages = await db.collection("messages").findOne({ _id: new ObjectId(id) });
    console.log(messages.from)
    console.log(user)

    if (messages.from !== user) {
        res.sendStatus(401);
        return;
    }
    if (messages) {
        db.collection("messages").deleteOne({ _id: messages._id })
    } else {
        res.sendStatus(404);
        return;
    }

    res.sendStatus(200);
})

server.post("/status", async (req, res) => {
    const user = await db.collection("participants").find({ name: req.headers.user }).toArray();

    if (user.some(e => e.name === req.headers.user)) {
        db.collection("participants").updateOne({
            name: req.headers.user
        }, { $set: { lastStatus: Date.now() } });
    } else {
        res.sendStatus(404);
        return;
    }
    res.sendStatus(200);
})

setInterval(() => {

    db.collection("participants").find().toArray()
        .then(users => {
            users.map(user => {
                if ((user.lastStatus + 15000) <= Date.now()) {

                    db.collection("participants").deleteOne({ lastStatus: user.lastStatus });
                    db.collection("messages").insertOne({
                        from: user.name,
                        to: "Todos",
                        text: "sai da sala...",
                        type: "status",
                        time: `${dayjs().hour()}:${dayjs().minute()}:${dayjs().second()}`
                    })
                }
            });
        })
}, 1000)

server.listen(5000, () => {
    console.log("Rodando em http://localhost:5000");
});