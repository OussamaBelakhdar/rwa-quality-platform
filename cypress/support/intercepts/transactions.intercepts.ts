import type { ReponseTransactions } from "@fixtures/builders/transaction.builder";
import type { InterceptAlias } from "@support/types";

/**
 * Factories d'intercept pour les transactions (ARCHITECTURE.md §4, couche L2).
 *
 * Les noms suivent le **matcher**, pas l'intention métier : `/transactions*`
 * est l'endpoint générique du flux personnel comme des filtres. Promettre
 * « personal » dans le nom ferait résoudre `cy.wait` sur la mauvaise requête
 * le jour où une seconde partirait de la même page.
 *
 * ── Espion, stub, ou entre les deux (ADR-008) ────────────────────────────
 * Trois familles, distinguées par le PRÉFIXE du nom exporté plutôt que par un
 * champ d'un objet d'options :
 *
 * | Préfixe            | Le backend répond | Ce que le test cesse de couvrir |
 * | ------------------ | ----------------- | ------------------------------- |
 * | `intercept…`       | oui               | rien                            |
 * | `delay…`/`mutate…` | oui               | rien, sauf le détail modifié    |
 * | `stub…`            | **non**           | **le contrat** : le stub ment   |
 *
 * Conséquence outillable, et vraie raison du choix : `grep -rn "stub" cypress/e2e/`
 * énumère exactement les endroits où un test a cessé d'exercer le contrat réel.
 *
 * Le corps de chaque famille est écrit UNE fois (`espionner`, `retarder`,
 * `muter`, `simuler`) ; les exports par endpoint ne sont que des noms. Ajouter
 * un domaine coûte donc des lignes de nommage, pas de logique.
 */

const URL_PUBLIQUE = "/transactions/public*";

/* ── Cœur générique, non exporté : L3 n'écrit jamais d'URL ───────────────── */

const espionner = (url: string, alias: string): InterceptAlias => {
  cy.intercept("GET", url).as(alias);
  return `@${alias}`;
};

/**
 * Retarde la VRAIE réponse.
 *
 * `cy.intercept(url, { delay })` ferait autre chose : un `StaticResponse` sans
 * corps, donc un stub vide servi en retard. Pour retarder ce que le backend a
 * réellement renvoyé, le retard se pose sur la réponse dans `req.continue`.
 */
const retarder = (url: string, alias: string, ms: number): InterceptAlias => {
  cy.intercept("GET", url, (req) =>
    req.continue((res) => {
      res.setDelay(ms);
    })
  ).as(alias);
  return `@${alias}`;
};

const muter = (
  url: string,
  alias: string,
  mutation: (corps: ReponseTransactions) => void
): InterceptAlias => {
  cy.intercept("GET", url, (req) =>
    req.continue((res) => {
      mutation(res.body as ReponseTransactions);
    })
  ).as(alias);
  return `@${alias}`;
};

/** Réponses que le backend ne produit pas. L'union interdit `{ statusCode, forceNetworkError }`. */
type ReponseSimulee = { statusCode: number; body: object } | { forceNetworkError: true };

const simuler = (url: string, alias: string, reponse: ReponseSimulee): InterceptAlias => {
  cy.intercept("GET", url, reponse).as(alias);
  return `@${alias}`;
};

/* ── Espions ─────────────────────────────────────────────────────────────── */

export const interceptTransactions = (): InterceptAlias =>
  espionner("/transactions*", "transactions");

export const interceptPublicTransactions = (): InterceptAlias =>
  espionner(URL_PUBLIQUE, "publicTransactions");

/**
 * Espion d'une page précise du défilement infini.
 *
 * Le premier `FETCH` part SANS paramètre `page` (`TransactionPublicList.tsx`),
 * les suivants avec `page=N`. Aucun matcher ne sait exprimer « absence de
 * page » : le séquençage repose donc sur la priorité des intercepts, qui va du
 * **dernier déclaré au premier**. Déclarer l'espion générique d'abord, puis
 * celui de la page 2, donne deux alias disjoints — l'inverse les confondrait.
 */
export const interceptPublicTransactionsPage = (page: number): InterceptAlias => {
  const alias = `publicTransactionsPage${page}`;
  cy.intercept({ method: "GET", url: URL_PUBLIQUE, query: { page: String(page) } }).as(alias);
  return `@${alias}`;
};

/* ── Espions modifiants : la vraie réponse, servie autrement ─────────────── */

export const delayPublicTransactions = (ms: number): InterceptAlias =>
  retarder(URL_PUBLIQUE, "publicTransactionsRetardees", ms);

export const mutatePublicTransactions = (
  mutation: (corps: ReponseTransactions) => void
): InterceptAlias => muter(URL_PUBLIQUE, "publicTransactionsMutees", mutation);

/* ── Stubs : le backend n'est pas joint ──────────────────────────────────── */

export const stubPublicTransactions = (corps: ReponseTransactions): InterceptAlias =>
  simuler(URL_PUBLIQUE, "publicTransactionsStub", { statusCode: 200, body: corps });

/** `axios` rejette, `dataMachine` part en `failure`. */
export const stubPublicTransactionsEnErreur = (statusCode = 500): InterceptAlias =>
  simuler(URL_PUBLIQUE, "publicTransactionsErreur", { statusCode, body: {} });

/**
 * Coupe la requête au niveau transport : pas de statut, pas de corps.
 *
 * Distinct d'un 500 : côté serveur rien n'a répondu. Le test dira si
 * l'application sait faire la différence — ou non.
 */
export const stubPublicTransactionsInjoignable = (): InterceptAlias =>
  simuler(URL_PUBLIQUE, "publicTransactionsCoupees", { forceNetworkError: true });
