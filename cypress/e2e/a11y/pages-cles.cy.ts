import { verifierAccessibilite } from "@support/a11y";

// Niveau E2E + axe (ADR-004, ligne 10) : une violation d'accessibilité naît
// souvent de la COMPOSITION — contraste sur un fond de page, ordre des titres
// entre composants voisins, libellé de région. Auditer les composants isolément
// passerait à côté. C'est le seul cas où l'E2E est le niveau le plus BAS.

/**
 * Base de référence au 2026-09-02, semaine 8. Ces règles étaient DÉJÀ violées
 * par l'application amont avant ce projet. Elles sont relevées à chaque run,
 * elles ne bloquent pas — mais aucune NOUVELLE violation n'est tolérée, et
 * toute règle corrigée doit être retirée d'ici, sinon le test échoue.
 *
 * TROIS règles ont été corrigées en semaine 8 et ne figurent donc pas :
 * `link-name` (logo du NavBar et lien du pied de page sans nom accessible),
 * `image-alt` (avatars sans texte alternatif, 24 nœuds) et `list` (le tiroir
 * de navigation rendait des `<a>` directement dans un `<ul>`).
 *
 * `list` est sortie de la base parce que la base l'A EXIGÉ : la première
 * correction était incomplète, et c'est le test qui a refusé de garder une
 * règle devenue verte. Deux pages n'ont plus aucune violation connue.
 */
const BASE = {
  navigation: [],
  fluxPublic: ["listitem", "color-contrast", "aria-required-children"],
  creation: [],
};

describe("Accessibilité — pages clés", { tags: ["@a11y", "@regression"] }, () => {
  beforeEach(() => {
    cy.seed("default");
    cy.login("Heath93");
  });

  it("le flux public ne présente aucune violation bloquante", () => {
    cy.visit("/");
    cy.getBySel("transaction-list").should("exist");
    verifierAccessibilite("flux public", BASE.fluxPublic);
  });

  it("les notifications ne présentent aucune violation bloquante", () => {
    cy.visit("/notifications");
    cy.getBySel("notifications-list").should("exist");
    verifierAccessibilite("notifications", BASE.navigation);
  });

  it("les comptes bancaires ne présentent aucune violation bloquante", () => {
    cy.visit("/bankaccounts");
    cy.getBySel("bankaccount-list").should("exist");
    verifierAccessibilite("comptes bancaires", BASE.navigation);
  });

  it("les paramètres utilisateur ne présentent aucune violation bloquante", () => {
    cy.visit("/user/settings");
    cy.getBySel("user-settings-form").should("exist");
    verifierAccessibilite("paramètres utilisateur", BASE.navigation);
  });

  it("la création de transaction ne présente aucune violation bloquante", () => {
    cy.visit("/transaction/new");
    cy.getBySel("users-list").should("exist");
    verifierAccessibilite("création de transaction", BASE.creation);
  });
});
