import { premiereDe } from "@fixtures/builders/transaction.builder";
import type { ReponseTransactions } from "@fixtures/builders/transaction.builder";
import { fetchPublicTransactions } from "@support/app-actions/xstate.actions";
import {
  interceptPublicTransactions,
  interceptPublicTransactionsPage,
} from "@support/intercepts/transactions.intercepts";

// Niveau E2E : ce qui est vérifié est l'accumulation des pages dans le
// contexte de la machine puis dans le DOM. Le contrat de `?page=2` seul se
// prouverait en `cy.request` ; l'accumulation, non.
//
// Le plan de la semaine 5 visait la pagination des NOTIFICATIONS. Constaté :
// `notificationsMachine` appelle `GET /notifications` sans aucun paramètre de
// page — cette liste ne pagine pas. La seule pagination de l'application est
// le défilement infini des listes de transactions.
//
// Second constat, qui décide de la forme du test : l'état `loading` de
// `dataMachine` ne déclare AUCUNE transition sur `FETCH`. Un `FETCH` envoyé
// pendant le chargement de la page 1 est perdu en silence et la requête de la
// page 2 ne part jamais. Le séquençage commence dans la machine, pas dans le
// réseau — d'où l'attente de fin de chargement avant de demander la suite.
//
// Ce que la spec vérifie ensuite : la page 2 s'AJOUTE. `dataMachine.setResults`
// concatène dès que `pageData.page > 1`, donc la première ligne doit être
// encore affichée après l'arrivée de la seconde page.

/** Corps d'une interception, ou un échec qui nomme la cause. Typé structurellement : `Interception` n'est pas exporté dans le namespace `Cypress`. */
const corpsDe = (interception?: { response?: { body: unknown } }): ReponseTransactions => {
  const corps = interception?.response?.body;
  if (!corps) {
    throw new Error("Interception sans réponse : la page attendue n'est jamais arrivée.");
  }
  return corps as ReponseTransactions;
};

describe(
  "Réseau — le flux public charge la page suivante sans perdre la précédente",
  { tags: ["@network", "@regression"] },
  () => {
    beforeEach(() => {
      cy.seed("default");
      cy.login("Heath93");
    });

    it("la page 2 s'ajoute aux transactions déjà affichées, sans les dupliquer", () => {
      // ORDRE SIGNIFICATIF : l'espion générique d'abord, celui de la page 2
      // ensuite. Cypress résout du dernier intercept déclaré au premier.
      const premiere = interceptPublicTransactions();
      const seconde = interceptPublicTransactionsPage(2);

      cy.visit("/");
      // Attendre que la page 1 soit RENDUE — donc que la machine ait quitté
      // `loading` — sans la consommer avec un `cy.wait`. `not.exist` sur le
      // squelette ne suffirait pas : il passe aussi AVANT que le squelette
      // n'apparaisse, et le `FETCH` serait alors perdu (essayé, échoué).
      cy.getBySelLike("transaction-item").should("have.length.greaterThan", 0);
      fetchPublicTransactions({ page: 2 });

      cy.wait([premiere, seconde]).then(([p1, p2]) => {
        const page1 = corpsDe(p1).results;
        const page2 = corpsDe(p2).results;
        const ids = new Set(page1.map((t) => t.id));
        expect(
          page2.some((t) => ids.has(t.id)),
          "les deux pages ne se recouvrent pas"
        ).to.be.false;

        const ligne = premiereDe(corpsDe(p1));
        cy.getBySelWithId("transaction-item", ligne.id).should("contain", ligne.description);
      });
    });
  }
);
