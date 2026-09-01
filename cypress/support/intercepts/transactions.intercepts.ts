import type { ReponseTransactions } from "@fixtures/builders/transaction.builder";
import { espionner, muter, retarder, simuler } from "@support/intercepts/factories";
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
 * Le corps de chaque famille vit dans `factories.ts` et n'existe qu'en un
 * exemplaire ; les exports ci-dessous ne sont que des noms. Ajouter un domaine
 * coûte des lignes de nommage, pas de logique.
 */

const URL_PUBLIQUE = "/transactions/public*";

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
): InterceptAlias => muter<ReponseTransactions>(URL_PUBLIQUE, "publicTransactionsMutees", mutation);

/* ── Stubs : le backend n'est pas joint ──────────────────────────────────── */

export const stubPublicTransactions = (corps: ReponseTransactions): InterceptAlias =>
  simuler(URL_PUBLIQUE, "publicTransactionsStub", { statusCode: 200, body: corps });

/**
 * `axios` rejette, `dataMachine` part en `failure`.
 *
 * `fois` limite la panne aux N premières requêtes : au-delà, le backend
 * répond de nouveau. C'est ce qui permet de tester une reprise.
 */
export const stubPublicTransactionsEnErreur = (statusCode = 500, fois?: number): InterceptAlias =>
  simuler(URL_PUBLIQUE, "publicTransactionsErreur", { statusCode, body: {} }, fois);

/**
 * Coupe la requête au niveau transport : pas de statut, pas de corps.
 *
 * Distinct d'un 500 : côté serveur rien n'a répondu. Le test dira si
 * l'application sait faire la différence — ou non.
 */
export const stubPublicTransactionsInjoignable = (): InterceptAlias =>
  simuler(URL_PUBLIQUE, "publicTransactionsCoupees", { forceNetworkError: true });
