import { retarder, simuler } from "@support/intercepts/factories";
import type { InterceptAlias } from "@support/types";

/**
 * Les matchers sont ANCRÉS SUR L'API (`Cypress.expose("apiUrl")`), pas écrits
 * en chemin relatif.
 *
 * Constaté : `"/notifications*"` matchait aussi la navigation du navigateur
 * vers `http://localhost:3000/notifications` — le front et l'API partagent ce
 * chemin — et `cy.visit` recevait le 500 destiné à l'appel XHR. Un matcher
 * relatif ne dit pas à QUI il parle.
 */
const api = (chemin: string): string => `${Cypress.expose("apiUrl")}${chemin}`;

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
