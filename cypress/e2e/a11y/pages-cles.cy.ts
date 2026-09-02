import { verifierAccessibilite } from "@support/a11y";

// Niveau E2E + axe (ADR-004, ligne 10) : une violation d'accessibilité naît
// souvent de la COMPOSITION — contraste sur un fond de page, ordre des titres
// entre composants voisins, libellé de région. Auditer les composants isolément
// passerait à côté. C'est le seul cas où l'E2E est le niveau le plus BAS.

describe("Accessibilité — pages clés", { tags: ["@a11y", "@regression"] }, () => {
  beforeEach(() => {
    cy.seed("default");
    cy.login("Heath93");
  });

  it("le flux public ne présente aucune violation bloquante", () => {
    cy.visit("/");
    cy.getBySel("transaction-list").should("exist");
    verifierAccessibilite("flux public");
  });

  it("les notifications ne présentent aucune violation bloquante", () => {
    cy.visit("/notifications");
    cy.getBySel("notifications-list").should("exist");
    verifierAccessibilite("notifications");
  });

  it("les comptes bancaires ne présentent aucune violation bloquante", () => {
    cy.visit("/bankaccounts");
    cy.getBySel("bankaccount-list").should("exist");
    verifierAccessibilite("comptes bancaires");
  });

  it("les paramètres utilisateur ne présentent aucune violation bloquante", () => {
    cy.visit("/user/settings");
    cy.getBySel("user-settings-form").should("exist");
    verifierAccessibilite("paramètres utilisateur");
  });

  it("la création de transaction ne présente aucune violation bloquante", () => {
    cy.visit("/transaction/new");
    cy.getBySel("users-list").should("exist");
    verifierAccessibilite("création de transaction");
  });
});
