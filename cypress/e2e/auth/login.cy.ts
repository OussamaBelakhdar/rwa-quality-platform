// Niveau E2E : c'est le seul test du dépôt qui parcourt le formulaire de
// connexion. Partout ailleurs, `cy.login` passe par la session (P2).
// Un test de composant sur SignInForm vérifierait la validation des champs,
// pas l'intégration formulaire → XState → API → redirection.

import { interceptLogin } from "@support/intercepts/auth.intercepts";

describe("Auth — connexion par le formulaire", { tags: ["@auth", "@smoke"] }, () => {
  beforeEach(() => {
    cy.seed("default");
    cy.visit("/signin");
  });

  it("connecte un utilisateur valide et le mène à son tableau de bord", () => {
    const connexion = interceptLogin();

    cy.env<{ defaultPassword?: string }>(["defaultPassword"]).then(({ defaultPassword }) => {
      // Pas de `as string` : un cast non vérifié appartient à la même famille
      // que `any`, que rules/typescript.md interdit. La garde rend le type sûr.
      if (!defaultPassword) throw new Error("env.defaultPassword est vide.");
      cy.getBySel("signin-username").type("Heath93");
      cy.getBySel("signin-password").type(defaultPassword, { log: false });
      cy.getBySel("signin-submit").click();
    });

    cy.wait(connexion).its("response.statusCode").should("eq", 200);
    cy.location("pathname").should("eq", "/");
    cy.getBySel("sidenav-username").should("contain", "Heath93");
  });

  it("refuse un mot de passe invalide sans quitter la page", () => {
    cy.getBySel("signin-username").type("Heath93");
    cy.getBySel("signin-password").type("mauvais-mot-de-passe", { log: false });
    cy.getBySel("signin-submit").click();

    cy.getBySel("signin-error")
      .should("be.visible")
      .and("contain", "Username or password is invalid");
    cy.location("pathname").should("eq", "/signin");
  });
});
