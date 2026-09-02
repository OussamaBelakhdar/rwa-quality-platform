import UserListSearchForm from "./UserListSearchForm";

// Niveau COMPOSANT (ADR-004, ligne 3). Même contrat que CommentForm : ce
// `data-test` passe par `inputProps` de MUI, donc le contrôle statique ne dit
// rien de sa présence dans le DOM. Aucune spec E2E ne couvre encore la liste
// d'utilisateurs — ce test est la seule chose qui tienne la promesse du
// sélecteur en attendant.

describe("UserListSearchForm", () => {
  it("pose le data-test sur l'<input> lui-même, pas sur un conteneur", () => {
    cy.mount(<UserListSearchForm userListSearch={() => undefined} />);
    cy.getBySel("user-list-search-input").should("match", "input");
  });

  it("remonte la recherche à la frappe", () => {
    const userListSearch = cy.stub().as("recherche");
    cy.mount(<UserListSearchForm userListSearch={userListSearch} />);
    cy.getBySel("user-list-search-input").type("bob");
    cy.get("@recherche").should("have.been.calledWith", { q: "bob" });
  });
});
