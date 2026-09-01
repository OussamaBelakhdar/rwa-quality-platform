import type { InterceptAlias } from "@support/types";

/**
 * Cœur des familles d'intercept — couche L2, usage INTERNE au dossier
 * `intercepts/` (ADR-008).
 *
 * Ces quatre fonctions ne sont jamais appelées depuis une spec : elles prennent
 * une URL, or L3 ne doit pas connaître les matchers. Chaque fichier de domaine
 * les habille de noms qui disent la famille — `intercept…` (espion),
 * `delay…`/`mutate…` (espion modifiant), `stub…` (le backend n'est pas joint).
 *
 * C'est ici que se vérifie la promesse de l'ADR : le nombre d'exports croît
 * avec les domaines, la logique non. Elle tient en ce fichier.
 */

const alias = (nom: string): InterceptAlias => `@${nom}`;

/**
 * Ancre un chemin sur l'API — TOUT matcher de ce dossier passe par ici.
 *
 * Un matcher relatif ne dit pas à qui il parle. Constaté : `"/notifications*"`
 * matchait aussi la NAVIGATION du navigateur vers
 * `http://localhost:3000/notifications`, parce que le front et l'API partagent
 * ce chemin, et `cy.visit` recevait le 500 destiné à l'appel XHR.
 *
 * Les autres matchers du dossier n'avaient jamais collisionné — par chance :
 * la route front du détail est `/transaction/:id` au SINGULIER, l'API est
 * `/transactions/:id`. Une convention de nommage de l'amont n'est pas une
 * garantie. Toutes les requêtes de l'application sont absolues vers
 * `http://localhost:<backendPort>` (aucun proxy Vite ; `src/setupProxy.js` est
 * un vestige CRA), donc l'ancrage est exact, pas approximatif.
 */
export const api = (chemin: string): string => `${Cypress.expose("apiUrl")}${chemin}`;

/** Méthode HTTP du matcher. `POST` sert au moins à `/graphql`, par où passent les comptes bancaires. */
export type Methode = "GET" | "POST";

/** Observe sans modifier : le backend répond, la réponse passe intacte. */
export const espionner = (url: string, nom: string, methode: Methode = "GET"): InterceptAlias => {
  cy.intercept(methode, url).as(nom);
  return alias(nom);
};

/**
 * Retarde la VRAIE réponse.
 *
 * `cy.intercept(url, { delay })` ferait autre chose : un `StaticResponse` sans
 * corps, donc un stub vide servi en retard. Pour retarder ce que le backend a
 * réellement renvoyé, le retard se pose sur la réponse dans `req.continue`.
 */
export const retarder = (url: string, nom: string, ms: number): InterceptAlias => {
  cy.intercept("GET", url, (req) =>
    req.continue((res) => {
      res.setDelay(ms);
    })
  ).as(nom);
  return alias(nom);
};

/**
 * Modifie la vraie réponse avant qu'elle n'atteigne l'application.
 *
 * La mutation reçoit le corps désérialisé et le modifie en place : c'est le
 * seul moyen d'exercer un rendu sur des données réelles à un détail près, sans
 * écrire ce détail en base où il survivrait au test.
 */
export const muter = <T>(
  url: string,
  nom: string,
  mutation: (corps: T) => void
): InterceptAlias => {
  cy.intercept("GET", url, (req) =>
    req.continue((res) => {
      mutation(res.body as T);
    })
  ).as(nom);
  return alias(nom);
};

/** Réponses hors du domaine du backend. L'union interdit `{ statusCode, forceNetworkError }`. */
export type ReponseSimulee = { statusCode: number; body: object } | { forceNetworkError: true };

/**
 * Remplace la réponse : le backend n'est pas joint, et le stub peut mentir sur
 * le contrat.
 *
 * `fois` borne le nombre de requêtes stubées, après quoi la route est retirée
 * et les suivantes atteignent le backend. C'est le seul moyen fiable de
 * simuler « une panne puis un rétablissement » : constaté, deux intercepts au
 * matcher IDENTIQUE ne se remplacent pas — le stub déclaré en premier continue
 * de servir, même si un espion est déclaré après lui. (Deux matchers
 * DIFFÉRENTS, eux, se départagent bien du dernier déclaré au premier : c'est
 * ce dont dépend `interceptPublicTransactionsPage`.)
 */
export const simuler = (
  url: string,
  nom: string,
  reponse: ReponseSimulee,
  fois?: number,
  methode: Methode = "GET"
): InterceptAlias => {
  cy.intercept(
    fois === undefined ? { method: methode, url } : { method: methode, url, times: fois },
    reponse
  ).as(nom);
  return alias(nom);
};
