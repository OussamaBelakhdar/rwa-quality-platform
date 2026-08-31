// Niveau E2E : `.its` et `.invoke` se démontrent sur des sujets produits par
// l'application réelle, y compris asynchrones.

describe("Fondations — naviguer dans le sujet", { tags: ["@foundations", "@regression"] }, () => {
  beforeEach(() => {
    cy.seed("default");
    cy.login("Heath93");
    cy.visit("/");
  });

  it("descend dans une propriété avec .its, en conservant le retry", () => {
    cy.getBySelLike("transaction-item").its("length").should("be.greaterThan", 0);
  });

  it("appelle une méthode du sujet avec .invoke, sans figer la chaîne", () => {
    // Contraste avec le `.then` de la spec 03 : ici la chaîne reste
    // retriable de bout en bout, l'assertion peut donc rejouer.
    cy.getBySel("sidenav-user-balance")
      .invoke("text")
      .should("match", /^-?\$[\d,]+\.\d{2}$/);
  });

  it("réintroduit une valeur externe dans la chaîne avec cy.wrap", () => {
    const attendu = "Heath93";
    // cy.wrap rend une valeur ordinaire chaînable : c'est le pont entre du
    // code JavaScript classique et la file de commandes. L'assertion porte
    // sur l'application, pas sur la constante.
    cy.wrap(attendu).then((nom) => {
      cy.getBySel("sidenav-username").invoke("text").should("contain", nom);
    });
  });
});
