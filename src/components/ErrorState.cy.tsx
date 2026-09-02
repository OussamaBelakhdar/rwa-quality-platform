import ErrorState from "./ErrorState";

// Niveau COMPOSANT (ADR-004, ligne 3) : props → rendu. Le bouton se prouve par
// son `onRetry`, sans réseau ni machine d'état.

describe("ErrorState", () => {
  it("affiche l'entité et le message porté par la machine", () => {
    cy.mount(<ErrorState entity="transactions" message="Request failed with status code 500" />);
    cy.getBySel("error-state").should("contain", "Unable to load transactions");
    cy.getBySel("error-state-message").should("have.text", "Request failed with status code 500");
  });

  it("n'affiche AUCUN bouton sans reprise possible", () => {
    // Un bouton qui ne mène nulle part est pire qu'une absence de bouton.
    cy.mount(<ErrorState entity="notifications" message="Network Error" />);
    cy.getBySel("error-state").should("be.visible");
    cy.getBySel("error-state-retry").should("not.exist");
  });

  it("appelle onRetry au clic", () => {
    // C'est ce que l'E2E ne peut pas isoler : ici on prouve le CONTRAT du
    // composant, pas l'effet de bout en bout.
    const onRetry = cy.stub().as("reprise");
    cy.mount(<ErrorState entity="transactions" message="500" onRetry={onRetry} />);
    cy.getBySel("error-state-retry").click();
    cy.get("@reprise").should("have.been.calledOnce");
  });
});
