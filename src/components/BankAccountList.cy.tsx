import BankAccountList from "./BankAccountList";

// Niveau COMPOSANT (ADR-004, ligne 2). Même défaut que NotificationList, même
// correction, et donc la même paire de tests : c'est le partage d'ErrorState
// qui rend cette symétrie possible.

describe("BankAccountList", () => {
  it("montre l'écran d'erreur plutôt que « aucun compte »", () => {
    cy.mount(
      <BankAccountList
        bankAccounts={[]}
        deleteBankAccount={() => undefined}
        hasError
        errorMessage="Request failed with status code 500"
      />
    );
    cy.getBySel("error-state").should("contain", "Unable to load bank accounts");
    cy.getBySel("empty-list-header").should("not.exist");
  });

  it("montre « aucun compte » quand la liste est vraiment vide", () => {
    cy.mount(<BankAccountList bankAccounts={[]} deleteBankAccount={() => undefined} />);
    cy.getBySel("empty-list-header").should("have.text", "No Bank Accounts");
    cy.getBySel("error-state").should("not.exist");
  });
});
