///<reference path="types.ts" />

import express from "express";
import {
  createBankAccountForUser,
  createTransaction,
  createUser,
  getAllForEntity,
  getUserByUsername,
  seedDatabase,
  seedDatabaseWith,
} from "./database";
import { validateMiddleware } from "./helpers";
import { isValidEntityValidator } from "./validators";
import { DbSchema } from "../src/models/db-schema";
const router = express.Router();

// Routes

//POST /testData/seed
router.post("/seed", (req, res) => {
  seedDatabase();
  res.sendStatus(200);
});

/**
 * POST /testData/seed/:scenario — réinitialise depuis une graine nommée.
 *
 * `default` rejoue `database-seed.json`, `empty` rejoue `empty-seed.json`.
 * Les deux fichiers existent déjà dans `data/` ; cette route les rend
 * atteignables depuis les tests sans qu'aucun écrive dans lowdb
 * (docs/ARCHITECTURE.md §4, couche L1).
 */
router.post("/seed/:scenario", (req, res) => {
  const graines: Record<string, string> = {
    default: "database-seed.json",
    empty: "empty-seed.json",
  };
  const fichier = graines[req.params.scenario];
  if (!fichier) {
    res.status(400).json({
      error: `Scénario inconnu : ${req.params.scenario}. Connus : ${Object.keys(graines).join(", ")}.`,
    });
    return;
  }
  seedDatabaseWith(fichier);
  res.sendStatus(200);
});

/**
 * POST /testData/user — crée un utilisateur, avec ou sans compte bancaire.
 *
 * Le drapeau `withBankAccount` existe pour une raison précise : le dialogue
 * d'onboarding ne s'ouvre que pour un utilisateur SANS compte, et les cinq
 * utilisateurs de la graine par défaut en ont tous un.
 */
router.post("/user", (req, res) => {
  const { withBankAccount = true, ...details } = req.body;

  // Refuser un username déjà pris. Sans cette garde, `createUser` en crée un
  // second silencieusement, et `POST /login` en retourne un au hasard : le
  // test authentifie alors un utilisateur qu'il n'a pas créé, et échoue plus
  // loin sur une cause introuvable. Vérifié : deux appels identiques
  // produisaient deux utilisateurs et un login ambigu.
  if (getUserByUsername(details.username)) {
    res.status(409).json({ error: `Le username « ${details.username} » est déjà pris.` });
    return;
  }

  const user = createUser(details);
  if (withBankAccount) {
    createBankAccountForUser(user.id, {
      bankName: `${user.username} Bank`,
      accountNumber: "1234567890",
      routingNumber: "987654321",
    });
  }
  res.status(201).json({ user });
});

/**
 * POST /testData/transaction — crée une transaction entre deux utilisateurs.
 */
router.post("/transaction", (req, res) => {
  const { senderId, transactionType = "payment", ...details } = req.body;
  const transaction = createTransaction(senderId, transactionType, details);
  res.status(201).json({ transaction });
});

//GET /testData/:entity
router.get("/:entity", validateMiddleware([...isValidEntityValidator]), (req, res) => {
  const { entity } = req.params;
  const results = getAllForEntity(entity as keyof DbSchema);

  res.status(200);
  res.json({ results });
});

export default router;
