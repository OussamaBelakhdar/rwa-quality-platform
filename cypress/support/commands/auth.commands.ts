import { loginByXstate } from "@support/app-actions/xstate.actions";
import { motDePasseParDefaut } from "@support/commands/env.commands";

/**
 * Connecte un utilisateur sans passer par le formulaire (P2 : l'UI ne sert
 * qu'à tester l'UI). Un seul test parcourt `/signin` — `e2e/auth/login.cy.ts`.
 *
 * ── Pourquoi le setup ne peut pas être un simple `cy.request('/login')` ──
 * Le plan de la semaine 2 prévoyait le login par `cy.request`. L'échange
 * d'identifiants s'y prête, mais il ne suffit pas : l'état d'authentification
 * de la RWA ne vit pas dans le cookie. `authMachine` démarre en `unauthorized`
 * (`authMachine.ts:43`) et ne consulte pas `/checkAuth` de lui-même — il
 * reprend l'état persisté dans `localStorage.authState` (`lignes 265-281`).
 * Un cookie valide sans cet état laisse l'application déconnectée.
 *
 * Reconstruire cet état à la main coûterait de sérialiser un `State` XState :
 * le code de test dépendrait des internes de la machine, ce qu'ADR-006 refuse.
 * Le setup amorce donc la machine **une seule fois**, et `cy.session` capture
 * cookies ET localStorage — c'est ce qui rend le cache efficace ici.
 *
 * `cy.request` reste utilisé là où il est le bon outil : la validation.
 */
Cypress.Commands.add("login", (username: string) => {
  motDePasseParDefaut().then((motDePasse) => {
    cy.session([username, "session-v1"], () => loginByXstate(username, motDePasse), {
      /**
       * Rejoué avant chaque restauration. Un cache restauré alors que la
       * session serveur a expiré produirait un échec au milieu du test, loin
       * de sa cause. `/checkAuth` répond 401 dans ce cas, et Cypress rejoue
       * le setup.
       */
      validate: () => {
        cy.request({
          url: `${Cypress.expose("apiUrl")}/checkAuth`,
          failOnStatusCode: false,
          log: false,
        })
          .its("status")
          .should("eq", 200);
      },
      cacheAcrossSpecs: true,
    });
  });
});

export {};
