import { api, espionner, retarder, simuler } from "@support/intercepts/factories";
import type { InterceptAlias } from "@support/types";

/**
 * Stubs d'échec pour les autres surfaces bâties sur `dataMachine`
 * (ARCHITECTURE.md §4, couche L2 — familles nommées, ADR-008).
 *
 * Elles partagent le même défaut d'origine que le flux de transactions : une
 * requête en échec y retombait sur l'écran « aucune donnée », ou sur rien du
 * tout pour le détail. Un stub par surface suffit à le prouver et à empêcher
 * le retour en arrière.
 */

/** `GET /notifications` — la liste des notifications ne pagine pas. */
export const stubNotificationsEnErreur = (statusCode = 500): InterceptAlias =>
  simuler(api("/notifications*"), "notificationsErreur", { statusCode, body: {} });

/**
 * `POST /graphql` — les comptes bancaires passent par GraphQL, pas par REST.
 *
 * La page des comptes n'émet que cette requête-là ; stuber tout `/graphql` n'y
 * atteint donc rien d'autre. Ailleurs, ce serait trop large.
 */
export const stubBankAccountsEnErreur = (statusCode = 500): InterceptAlias =>
  simuler(api("/graphql"), "bankAccountsErreur", { statusCode, body: {} }, undefined, "POST");

/** `GET /transactions/:id` — le détail d'une transaction. */
export const stubTransactionDetailEnErreur = (statusCode = 500): InterceptAlias =>
  simuler(api("/transactions/*"), "transactionDetailErreur", { statusCode, body: {} });

/**
 * Retarde la VRAIE réponse du détail, pour rendre observable l'état de
 * chargement — qui n'était rendu nulle part avant la semaine 5.
 */
export const delayTransactionDetail = (ms: number): InterceptAlias =>
  retarder(api("/transactions/*"), "transactionDetailRetarde", ms);

/** PATCH d'une notification : c'est lui qui la marque lue (`isRead: true`). */
export const interceptNotificationLue = (): InterceptAlias =>
  espionner(api("/notifications/*"), "notificationLue", "PATCH");

/** `PATCH /users/:id` — l'enregistrement du profil depuis les paramètres. */
export const interceptProfilEnregistre = (): InterceptAlias =>
  espionner(api("/users/*"), "profilEnregistre", "PATCH");
