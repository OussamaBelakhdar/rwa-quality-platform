import { completeOnboarding } from "@support/app-actions/xstate.actions";
import { userBuilder } from "../../fixtures/builders/user.builder";

// Niveau E2E : l'onboarding est un dialogue piloté par une machine XState,
// déclenché par l'absence de compte bancaire. Ni un test de composant ni
// cy.request ne font intervenir cette condition.
//
// Ce domaine était INTESTABLE avant la semaine 4 : les cinq utilisateurs de la
// graine ont tous un compte bancaire, donc le dialogue ne s'ouvrait jamais.
// C'est `cy.createUser(...withoutBankAccount())` qui le rend atteignable.

describe("Onboarding — premier accès", { tags: ["@onboarding", "@regression"] }, () => {
  beforeEach(() => {
    cy.seed("default");
  });

  it("ouvre le dialogue pour un utilisateur sans compte bancaire", () => {
    const nouveau = userBuilder().withoutBankAccount().build();

    cy.createUser(nouveau).then(() => {
      cy.login(nouveau.username);
      cy.visit("/");
      cy.getBySel("user-onboarding-dialog").should("be.visible");
    });
  });

  it("ne l'ouvre pas pour un utilisateur qui a déjà un compte", () => {
    const nouveau = userBuilder().withBankAccount().build();

    cy.createUser(nouveau).then(() => {
      cy.login(nouveau.username);
      cy.visit("/");
      // Assertion opposée à celle du test précédent, sur la même mécanique :
      // c'est l'opposition qui prouve que le compte bancaire est bien la
      // condition de déclenchement, et non un hasard de rendu.
      cy.getBySel("transaction-list").should("be.visible");
      cy.getBySel("user-onboarding-dialog").should("not.exist");
    });
  });

  it("termine l'onboarding par la machine, sans parcourir le dialogue", () => {
    const nouveau = userBuilder().withoutBankAccount().build();

    cy.createUser(nouveau).then(() => {
      cy.login(nouveau.username);
      cy.visit("/");
      cy.getBySel("user-onboarding-dialog").should("be.visible");

      // App action : envoie NEXT jusqu'à l'état final au lieu de cliquer.
      completeOnboarding();

      cy.appState("userOnboarding").should("eq", "done");
    });
  });
});
