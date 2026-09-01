// Niveau E2E : `.its` et `.invoke` se démontrent sur des sujets produits par
// l'application réelle, y compris asynchrones.

describe("Fondations — naviguer dans le sujet", { tags: ["@foundations", "@regression"] }, () => {
  beforeEach(() => {
    cy.seed("default");
    cy.login("Heath93");
    cy.visit("/");
  });

  it("descend de deux niveaux dans le sujet avec .its, sans rompre le retry", () => {
    // `.its` traverse des propriétés successives et reste retriable. Drainer
    // `0.textContent` plutôt que `length` évite de refaire la preuve de la
    // spec 02 : ce qui est démontré ici, c'est la traversée, pas le compte.
    cy.getBySel("sidenav-user-balance")
      .its("0.textContent")
      .should("match", /^-?\$[\d,]+\.\d{2}$/);
  });

  it("appelle une méthode du sujet AVEC arguments via .invoke", () => {
    // Ce que `.invoke` ajoute à `.its` : il appelle une fonction du sujet et
    // lui passe des arguments. `slice(0, 3)` renvoie un nouveau jQuery, qui
    // redevient le sujet de la chaîne — la démonstration porte sur l'appel,
    // pas sur le contenu de la liste (déjà prouvé en spec 02).
    cy.getBySelLike("transaction-item").invoke("slice", 0, 3).should("have.length", 3);
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
