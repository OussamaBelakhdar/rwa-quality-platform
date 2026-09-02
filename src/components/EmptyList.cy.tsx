import EmptyList from "./EmptyList";

// Niveau COMPOSANT (ADR-004, ligne 2) : rendu conditionnel sur une prop.

describe("EmptyList", () => {
  it("annonce l'entité absente dans son en-tête", () => {
    cy.mount(<EmptyList entity="Transactions" />);
    cy.getBySel("empty-list-header").should("have.text", "No Transactions");
  });

  it("rend ses enfants dans la zone prévue", () => {
    cy.mount(
      <EmptyList entity="Notifications">
        <span data-test="empty-list-children">rien à signaler</span>
      </EmptyList>
    );
    cy.getBySel("empty-list-header").should("have.text", "No Notifications");
    cy.getBySel("empty-list-children").should("contain", "rien à signaler");
  });
});
