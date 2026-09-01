/**
 * Contrat de typage de la couche L2 — vérifié par le compilateur, pas par une
 * capture d'écran.
 *
 * Le plan de la semaine 3 demandait « autocomplétion IDE vérifiée (capture
 * d'écran dans le README) ». Une capture prouve qu'un écran affichait quelque
 * chose un jour donné ; elle ne détecte aucune régression. Ce fichier fait
 * mieux : chaque `@ts-expect-error` ÉCHOUE À LA COMPILATION si l'erreur
 * attendue disparaît. Si quelqu'un élargit `DataTestKey` à `string`, `yarn
 * types` devient rouge — la garantie devient exécutable.
 *
 * Ce fichier n'est pas une spec (pas de `.cy.ts`) : il n'est jamais exécuté,
 * seulement compilé.
 */

export function contratDeTypage(): void {
  // ── cy.getBySel : clé exacte, issue de l'union générée depuis src/ ──
  cy.getBySel("sidenav-username");
  cy.getBySel("transaction-list");
  // @ts-expect-error une clé absente de src/ ne compile pas
  cy.getBySel("cle-qui-nexiste-pas");
  // @ts-expect-error une chaîne quelconque non plus
  cy.getBySel("transaction-lis");

  // ── cy.getBySelLike : préfixes fermés ──
  cy.getBySelLike("transaction-item");
  // @ts-expect-error un préfixe non déclaré ne compile pas
  cy.getBySelLike("transaction-");

  // ── cy.seed : scénarios publiés par ARCHITECTURE.md §4 ──
  cy.seed();
  cy.seed("default");
  cy.seed("empty"); // compile — non livré, échoue à l'exécution avec un message explicite
  // @ts-expect-error un scénario hors contrat ne compile pas
  cy.seed("gigantesque");

  // ── cy.appState : noms du registre ADR-006 ──
  cy.appState("auth");
  cy.appState("createTransaction");
  // @ts-expect-error un service non enregistré ne compile pas
  cy.appState("inexistant");

  // ── cy.login ──
  cy.login("Heath93");
  // @ts-expect-error le nom d'utilisateur est obligatoire
  cy.login();
}
