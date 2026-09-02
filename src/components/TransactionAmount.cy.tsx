import TransactionAmount from "./TransactionAmount";
import { transactionBuilder } from "@fixtures/builders/transaction.builder";
import { TransactionRequestStatus } from "../models";

// Niveau COMPOSANT (ADR-004, ligne 1) : props → rendu, aucun réseau.
//
// Ces cas ont d'abord été trouvés en E2E, en semaine 5, à ~480 ms l'unité et
// avec une base seedée. Ici : 36 ms et rien à démarrer. Les E2E de
// `network/reponse-modifiee.cy.ts` restent — leur objet est la mutation de
// réponse, pas le formatage.

describe("TransactionAmount", () => {
  it("rend un paiement avec un seul signe négatif", () => {
    const transaction = transactionBuilder().withAmount(4200).build();
    cy.mount(<TransactionAmount transaction={transaction} />);
    cy.getBySelWithId("transaction-amount", transaction.id).should("have.text", "-$42.00");
  });

  it("rend une DEMANDE avec un signe positif", () => {
    // `isRequestTransaction` ne regarde que la présence de `requestStatus` :
    // c'est ce champ, et lui seul, qui décide du sens affiché.
    const transaction = {
      ...transactionBuilder().withAmount(4200).build(),
      requestStatus: TransactionRequestStatus.pending,
    };
    cy.mount(<TransactionAmount transaction={transaction} />);
    cy.getBySelWithId("transaction-amount", transaction.id).should("have.text", "+$42.00");
  });

  it("ne produit qu'un seul signe sur un montant négatif", () => {
    // RÉGRESSION — rendait `--$5.00` avant la semaine 5. Le signe affiché est
    // le SENS de la transaction, pas celui du nombre.
    const transaction = transactionBuilder().withAmount(-500).build();
    cy.mount(<TransactionAmount transaction={transaction} />);
    cy.getBySelWithId("transaction-amount", transaction.id).should("have.text", "-$5.00");
  });

  it("rend un montant nul comme un montant, pas comme un zéro nu", () => {
    // RÉGRESSION — `{amount && format(amount)}` rendait le nombre 0, que React
    // affichait tel quel.
    const transaction = transactionBuilder().withAmount(0).build();
    cy.mount(<TransactionAmount transaction={transaction} />);
    cy.getBySelWithId("transaction-amount", transaction.id).should("have.text", "-$0.00");
  });

  it("rend un montant hors norme sans troncature", () => {
    const transaction = transactionBuilder().withAmount(123456789).build();
    cy.mount(<TransactionAmount transaction={transaction} />);
    cy.getBySelWithId("transaction-amount", transaction.id).should("have.text", "-$1,234,567.89");
  });
});
