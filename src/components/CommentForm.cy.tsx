import CommentForm from "./CommentForm";

// Niveau COMPOSANT (ADR-004, ligne 3) : props → rendu, sans réseau ni machine.
//
// Ce fichier prouve ce que `yarn check:selectors` ne PEUT pas prouver. Le script
// compare deux textes : le `data-test` écrit dans `src/` et l'union typée. Il ne
// sait rien du DOM. Or cet attribut-ci transite par `inputProps`, une prop de
// MUI : c'est la bibliothèque, pas notre code, qui décide de le poser sur
// l'<input> interne. MUI 9 a retiré `inputProps` de `TextField` (Dependabot #11)
// — le source restait valide, le contrôle statique restait vert, et l'attribut
// disparaissait du rendu. Seule une assertion sur le rendu attrape cette classe
// de panne, et elle l'attrape en millisecondes plutôt qu'en fin de shard E2E.

describe("CommentForm", () => {
  const transactionId = "abc123";

  it("pose le data-test sur l'<input> lui-même, pas sur un conteneur", () => {
    cy.mount(<CommentForm transactionId={transactionId} transactionComment={() => undefined} />);
    cy.getBySelWithId("transaction-comment-input", transactionId).should("match", "input");
  });

  it("remonte le commentaire saisi à la validation", () => {
    const transactionComment = cy.stub().as("commentaire");
    cy.mount(<CommentForm transactionId={transactionId} transactionComment={transactionComment} />);
    cy.getBySelWithId("transaction-comment-input", transactionId).type("premier{enter}");
    cy.get("@commentaire").should("have.been.calledOnceWith", {
      transactionId,
      content: "premier",
    });
  });
});
