import TransactionCreateStepOne from "./TransactionCreateStepOne";
import { DefaultPrivacyLevel, User } from "../models";

// Niveau COMPOSANT (ADR-004, ligne 3) : props → rendu, sans réseau ni machine.
//
// Ce composant n'a qu'un travail : composer la recherche et la liste, et faire
// remonter le destinataire choisi. Un E2E prouverait le parcours de virement
// entier — il ne dirait pas si c'est CE composant qui a perdu le clic. Le
// câblage `setReceiver` est justement ce qui casse en silence quand la liste
// change de forme.

const utilisateur = (id: string, firstName: string, lastName: string): User => ({
  id,
  uuid: `3f1a6c2e-0000-4000-8000-${id.padStart(12, "0")}`,
  firstName,
  lastName,
  username: `${firstName}${id}`,
  // Le composant ne lit pas le mot de passe ; chaîne vide plutôt qu'un faux
  // secret (rules/testing.md #3).
  password: "",
  email: `${firstName.toLowerCase()}@example.com`,
  phoneNumber: "615-555-0134",
  balance: 0,
  avatar: "",
  defaultPrivacyLevel: DefaultPrivacyLevel.public,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  modifiedAt: new Date("2026-01-01T00:00:00.000Z"),
});

const users = [utilisateur("1", "Heath", "Hills"), utilisateur("2", "Amir", "Sanchez")];

describe("TransactionCreateStepOne", () => {
  it("compose la recherche et la liste des destinataires", () => {
    cy.mount(
      <TransactionCreateStepOne
        users={users}
        setReceiver={() => undefined}
        userListSearch={() => undefined}
      />
    );
    cy.getBySel("user-list-search-input").should("match", "input");
    cy.getBySel("users-list").should("contain", "Heath Hills").and("contain", "Amir Sanchez");
  });

  it("remonte le destinataire choisi au clic", () => {
    const setReceiver = cy.stub().as("destinataire");
    cy.mount(
      <TransactionCreateStepOne
        users={users}
        setReceiver={setReceiver}
        userListSearch={() => undefined}
      />
    );
    cy.getBySelWithId("user-list-item", "2").click();
    cy.get("@destinataire").should("have.been.calledOnceWith", users[1]);
  });
});
