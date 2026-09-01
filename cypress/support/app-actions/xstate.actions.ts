import { interceptLogin } from "@support/intercepts/auth.intercepts";

/**
 * Accès aux services XState de l'application (couche L2).
 *
 * Seul endroit du dépôt autorisé à toucher `cy.window()` : les specs passent
 * par ces app actions (.claude/rules/testing.md #12).
 *
 * DETTE (2026-09-01, échéance semaine 3) — bascule sur `window.__services__`
 * sous garde `VITE_TEST_HOOKS`
 * (ADR-006, semaine 3). Cette implémentation lit `window.authService`, exposé
 * par l'amont sous garde `window.Cypress`, ce que la règle #12 et
 * ARCHITECTURE.md §4 désignent comme n'étant PAS la voie d'accès du projet.
 * Livré avant l'ADR qui la remplace ; seule cette fonction changera, aucune
 * spec ne bouge.
 */
export const loginByXstate = (username: string, password: string): void => {
  const login = interceptLogin();

  cy.visit("/signin", { log: false });

  // `cy.window()` se résout dès que l'objet window existe — ce qui peut
  // précéder l'évaluation du bundle. Déréférencer `authService` directement
  // lèverait un TypeError non retriable. `.should("have.property", …)` rejoue
  // jusqu'à ce que le service soit là : c'est le contrat « une app action
  // attend qu'un service apparaisse » (règle #12, ADR-006).
  cy.window({ log: false })
    .should("have.property", "authService")
    .invoke("send", "LOGIN", { username, password });

  cy.wait(login).its("response.statusCode").should("eq", 200);
};

/**
 * Envoie `FETCH` au service XState de la liste publique, avec un filtre
 * optionnel. C'est le même événement que le composant émet lui-même
 * (`TransactionPublicList.tsx:33`), sur le service qu'il enregistre sur
 * `window` (`ligne 27`).
 *
 * Distinct d'un `cy.getBySel("nav-personal-tab").click()`, qui démonte le
 * composant par React Router : ici le composant reste monté et c'est la
 * machine qui reconstruit ses lignes.
 *
 * Nuance vérifiée empiriquement : un `FETCH` sans filtre ne détache **pas**
 * les lignes. Les données revenant identiques, React réconcilie et réutilise
 * les mêmes noeuds — la liste est virtualisée (`react-virtualized`), mais
 * c'est la réconciliation, pas la virtualisation, qui les préserve. Il faut
 * que le jeu de résultats change pour observer un détachement.
 */
export const fetchPublicTransactions = (filtre?: Record<string, number>): void => {
  cy.window({ log: false })
    .should("have.property", "publicTransactionService")
    .invoke("send", "FETCH", filtre ?? {});
};
