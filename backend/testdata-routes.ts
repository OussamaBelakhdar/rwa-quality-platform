///<reference path="types.ts" />

import express from "express";
import {
  createBankAccountForUser,
  createTransaction,
  createUser,
  getAllForEntity,
  getUserById,
  getUserByUsername,
  seedDatabaseWith,
  GRAINES,
  NomDeGraine,
} from "./database";
import { validateMiddleware } from "./helpers";
import { isValidEntityValidator } from "./validators";
import { DbSchema } from "../src/models/db-schema";
const router = express.Router();

/**
 * Routes de données de test.
 *
 * ELLES N'EXISTENT PAS HORS MODE TEST : `backend/app.ts` ne monte ce routeur
 * que si `NODE_ENV` vaut `test` ou `development`. Vérifié — sous
 * `NODE_ENV=production`, tout ce fichier répond 404 (ADR-007).
 *
 * Ce sont des primitives d'ÉCRITURE ARBITRAIRE : création d'utilisateur et
 * virement entre deux comptes quelconques, sans authentification. C'est
 * acceptable derrière la garde ci-dessus, et seulement derrière elle.
 */

/** Champs obligatoires manquants dans un corps de requête. */
const manquants = (corps: Record<string, unknown>, requis: string[]): string[] =>
  requis.filter((champ) => corps[champ] === undefined || corps[champ] === "");

//POST /testData/seed
router.post("/seed", (req, res) => {
  seedDatabaseWith("default");
  res.sendStatus(200);
});

/**
 * GET /testData/seed/scenarios — la liste des graines, publiée par le backend.
 *
 * Source unique de vérité : le type `SeedScenario` côté Cypress recopiait
 * cette liste, et ajouter un scénario d'un seul côté compilait sans que rien
 * ne le signale. Un test de contrat compare désormais les deux.
 */
router.get("/seed/scenarios", (req, res) => {
  res.status(200).json({ scenarios: Object.keys(GRAINES) });
});

/** POST /testData/seed/:scenario — réinitialise depuis une graine nommée. */
router.post("/seed/:scenario", (req, res) => {
  const { scenario } = req.params;
  if (!Object.prototype.hasOwnProperty.call(GRAINES, scenario)) {
    res.status(400).json({
      error: `Scénario inconnu : ${scenario}. Connus : ${Object.keys(GRAINES).join(", ")}.`,
    });
    return;
  }
  seedDatabaseWith(scenario as NomDeGraine);
  res.sendStatus(200);
});

/**
 * POST /testData/user — crée un utilisateur, avec ou sans compte bancaire.
 *
 * `withBankAccount` existe pour une raison précise : le dialogue d'onboarding
 * ne s'ouvre que pour un utilisateur SANS compte, et les cinq utilisateurs de
 * la graine par défaut en ont tous un.
 */
router.post("/user", (req, res) => {
  const { withBankAccount = true, ...details } = req.body ?? {};

  const absents = manquants(details, [
    "firstName",
    "lastName",
    "username",
    "password",
    "email",
    "phoneNumber",
    "avatar",
    "defaultPrivacyLevel",
  ]);
  if (absents.length) {
    // 400 explicite plutôt que le 500 au corps vide que produisait
    // `bcrypt.hashSync(undefined)` : une tâche L1 qui oublie un champ obtient
    // le nom du champ, pas une stack.
    res.status(400).json({ error: `Champs obligatoires manquants : ${absents.join(", ")}.` });
    return;
  }

  // Refuser un username déjà pris. Sans cette garde, `createUser` en crée un
  // second silencieusement et `POST /login` en retourne un au hasard : le test
  // authentifie alors un utilisateur qu'il n'a pas créé. Vérifié.
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

/** POST /testData/transaction — crée une transaction entre deux utilisateurs. */
router.post("/transaction", (req, res) => {
  const { senderId, transactionType = "payment", ...details } = req.body ?? {};

  const absents = manquants({ senderId, ...details }, [
    "senderId",
    "receiverId",
    "amount",
    "description",
  ]);
  if (absents.length) {
    res.status(400).json({ error: `Champs obligatoires manquants : ${absents.join(", ")}.` });
    return;
  }
  // `getUserById` rendrait `undefined` et `createTransaction` planterait sur
  // `sender.defaultPrivacyLevel` — 500 opaque au lieu d'un 400 qui nomme.
  for (const [champ, id] of [
    ["senderId", senderId],
    ["receiverId", details.receiverId],
  ] as const) {
    if (!getUserById(id)) {
      res.status(400).json({ error: `${champ} inconnu : ${id}.` });
      return;
    }
  }

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
