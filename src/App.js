import express, { json } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import {MongoClient} from "mongodb";

const server = express();
server.use(cors());
server.use(json());

let db = null;
const mongoClient = new MongoClient(process.env.MONGO_URI);
const promise = mongoClient.connect();
promise.then(() => db = mongoClient.db("contatos"));


server.get('/contatos', (req, res) => {
  const promise = db.collection("contatos").find({}).toArray();
  promise.then(contatos => res.send(contatos));
  promise.catch(e => res.sendStatus(500));
});

server.post('/contatos', (req, res) => {
  if (!req.body.nome || !req.body.telefone) {
    res.status(422).send("Todos os campos são obrigatórios!");
    return;
  }

  // escreva seu código aqui
  const promise = db.collection("contatos").insertOne(req.body);
  promise.then(() => res.sendStatus(201));
  promise.catch(e => res.sendStatus(500));
})

server.listen(5000, () => {
  console.log("Rodando em http://localhost:5000");
});