import TransactionCreateStepOne from "./TransactionCreateStepOne";
import { userResponseBuilder } from "@fixtures/builders/user.builder";

// Niveau COMPOSANT (ADR-004, ligne 12) : props → rendu, sans réseau ni machine.
//
// Ce composant n'a qu'un travail : composer la recherche et la liste, et faire
// remonter le destinataire choisi. Un E2E prouverait le parcours de virement
// entier — il ne dirait pas si c'est CE composant qui a perdu le clic. Le
// câblage `setReceiver` est justement ce qui casse en silence quand la liste
// change de forme.

const users = [
  userResponseBuilder({ id: "1", firstName: "Heath", lastName: "Hills" }),
  userResponseBuilder({ id: "2", firstName: "Amir", lastName: "Sanchez" }),
];

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
