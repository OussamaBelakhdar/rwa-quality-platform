// Niveau E2E : la création d'un compte bancaire part d'un formulaire, passe par
// la machine XState et une mutation GraphQL — seule route GraphQL de cette
// application, tout le reste étant REST — puis la liste se re-rend. Le contrat
// de la mutation se prouverait en `cy.request` ; sa PROPAGATION jusqu'à la
// liste, non (ADR-004).
//
// Corrigée depuis `docs/ia/brut/3-bankaccount-creation.cy.ts.txt`. La version
// générée stubbait la réponse GraphQL puis vérifiait que la liste affichait ce
// que le stub venait de renvoyer : elle passait serveur éteint. Voir
// docs/ia-revue.md §2.

describe(
  "Comptes bancaires — création",
  { tags: ["@bank-accounts", "@smoke", "@ai-generated"] },
  () => {
    beforeEach(() => {
      cy.seed("default");
      cy.login("Heath93");
      cy.visit("/bankaccounts");
    });

    it("ajoute le compte à la liste, et il survit au rechargement", () => {
      const nom = `Banque ${Date.now()}`;

      cy.getBySel("bankaccount-new").click();
      cy.getBySel("bankaccount-bankName-input").type(nom);
      cy.getBySel("bankaccount-routingNumber-input").type("987654321");
      cy.getBySel("bankaccount-accountNumber-input").type("123456789");
      cy.getBySel("bankaccount-submit").click();

      cy.getBySel("bankaccount-list").should("contain", nom);

      // LA seule bonne idée des six specs générées, reprise ici : le
      // rechargement force un aller-retour serveur. Sans lui, l'assertion
      // ci-dessus ne distingue pas un état persisté d'un état seulement affiché
      // par la machine.
      cy.reload();
      cy.getBySel("bankaccount-list").should("contain", nom);
    });
  }
);
