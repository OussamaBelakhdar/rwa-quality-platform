// Niveau E2E : la suppression est un SOFT DELETE côté serveur
// (`removeBankAccountById` pose `isDeleted: true`), et l'UI le reflète sans
// retirer la ligne. Ce qui est testé est donc le CHANGEMENT D'ÉTAT d'un élément
// qui reste affiché — ni un test de composant, qui n'a pas le serveur, ni
// `cy.request`, qui n'a pas le rendu, ne l'observent (ADR-004).
//
// Corrigée depuis `docs/ia/brut/4-bankaccount-suppression.cy.ts.txt`.
//
// PIÈGE VÉRIFIÉ, ET JE SUIS TOMBÉ DEDANS. La spec générée asserted
// `have.length', n - 1` en supposant une suppression physique. J'ai corrigé en
// `should("not.exist")` sur l'identité du compte — mieux, mais faux pour la
// même raison de fond : j'avais lu le backend et supposé l'UI. Or
// `BankAccountItem.tsx:20` garde la ligne et lui ajoute « (Deleted) », et
// `:23` retire seulement le bouton. Le test a échoué, et c'est le test qui
// avait tort.
//
// La leçon vaut au-delà de l'IA : connaître le serveur ne dispense pas de lire
// le rendu. C'est le même défaut, à un étage de moins.

describe(
  "Comptes bancaires — suppression",
  { tags: ["@bank-accounts", "@regression", "@ai-generated"] },
  () => {
    beforeEach(() => {
      cy.seed("default");
      cy.login("Heath93");
      cy.visit("/bankaccounts");
    });

    it("marque le compte supprimé sans le retirer, et l'état survit au rechargement", () => {
      cy.getBySelLike("bankaccount-list-item")
        .first()
        .invoke("attr", "data-test")
        .then((cle) => {
          const id = String(cle).replace("bankaccount-list-item-", "");

          cy.getBySel("bankaccount-delete").first().click();

          // Sur l'IDENTITÉ du compte, pas sur un compteur : une assertion de
          // longueur passerait aussi si c'était un autre compte qui avait
          // changé d'état.
          cy.getBySelWithId("bankaccount-list-item", id).should("contain", "(Deleted)");
          // Le bouton disparaît : c'est ce qui empêche une seconde suppression.
          cy.getBySelWithId("bankaccount-list-item", id)
            .find("[data-test=bankaccount-delete]")
            .should("not.exist");

          cy.reload();
          cy.getBySelWithId("bankaccount-list-item", id).should("contain", "(Deleted)");
        });
    });
  }
);
