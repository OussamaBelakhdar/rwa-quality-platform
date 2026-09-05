// Démonstration de `cy.prompt`, hors du specPattern par conception (ADR-011).
//
// ── Pourquoi ce fichier n'est PAS dans la suite ──
// `cy.prompt` exige un compte Cypress Cloud : le prompt et le contexte de la
// page partent chez un tiers, qui appelle le LLM et renvoie des commandes. Deux
// conséquences, et chacune suffirait :
//
//   1. P6 — « reproductible par un inconnu, sans compte Cloud ». Une spec de la
//      suite qui exige un compte casse la promesse pour tout le monde.
//   2. Le résultat n'est PAS déterministe. Un gate bloquant dont le corps est
//      régénéré à chaque exécution ne détecte plus les régressions : il détecte
//      les changements de modèle. C'est l'inverse du travail demandé.
//
// La deuxième raison est la vraie. Même avec un compte gratuit pour tous,
// `cy.prompt` n'aurait pas sa place dans un gate.
//
//     CYPRESS_PROJECT_ID=<votre id> yarn cy:demo:prompt
//
// ── Le prérequis réel, découvert à l'exécution ──
// `cy.prompt` n'exige pas seulement un COMPTE Cypress Cloud, il exige un PROJET
// CONNECTÉ : « cy.prompt requires a valid projectId. We were unable to find an
// existing projectId set in your Cypress config file. » La première rédaction
// d'ADR-011 supposait qu'une connexion suffisait. Elle avait tort.
//
// L'assistant Cloud, lui, écrit ce `projectId` directement dans
// `cypress.config.ts` — et `check-cloud.js` le refuse, à raison.
//
// La sortie tient en une variable d'environnement, vérifiée et non supposée :
// `CYPRESS_PROJECT_ID` suffit, `Cypress.config("projectId")` rend bien la
// valeur alors que le fichier de configuration n'en contient AUCUNE.
//
// La borne 2 d'ADR-011 tient donc telle qu'écrite — « rien qui rattache le
// dépôt à un compte n'est commité ». Un identifiant propre à un opérateur
// appartient à son environnement, pas au dépôt de tout le monde.

describe("Démonstration — cy.prompt", { tags: ["@manual", "@ai-generated"] }, () => {
  it("traduit un parcours décrit en langage naturel en commandes Cypress", () => {
    // ── Ce qui N'EST PAS délégué ──
    // Le seed, la session et la navigation sont déjà déterministes et déjà
    // typés (L2). Les confier au LLM échangerait trois commandes fiables
    // contre trois commandes probables. La règle qui en sort, et c'est elle
    // que la revue doit retenir : on ne délègue à l'IA que ce qu'on ne sait
    // pas encore écrire, jamais ce qu'on a déjà écrit.
    cy.seed("default");
    cy.login("Heath93");
    cy.visit("/");

    // ── Ce qui EST délégué ──
    // La création d'une transaction : un parcours à quatre écrans qu'aucune
    // spec du dépôt ne couvre encore. C'est le cas d'usage honnête de
    // `cy.prompt` — l'exploration d'un parcours non écrit, pas la réécriture
    // d'un parcours connu.
    //
    // `placeholders` existe pour que les valeurs sensibles ne partent PAS dans
    // le prompt : Cypress les substitue côté runner, après la génération. Ici
    // le montant n'a rien de secret — c'est la mécanique qui est montrée, et
    // c'est par elle qu'un mot de passe passerait si le parcours en demandait
    // un.
    cy.prompt(
      [
        "ouvre le formulaire de nouvelle transaction",
        "choisis le premier contact proposé",
        "saisis le montant {{montant}} et la description « déjeuner »",
        "envoie une demande de paiement",
        "vérifie que la transaction apparaît ensuite dans l'historique personnel",
      ],
      { placeholders: { montant: "25" } }
    );

    // ── Ce que la démonstration doit produire ──
    // Le Command Log affiche les commandes GÉNÉRÉES, et Cypress propose de les
    // recopier dans le fichier. C'est cette sortie — pas le fait que le test
    // passe — qui est l'objet de la revue : `docs/ia-revue.md`.
    //
    // Un test généré qui passe n'est pas un test qui prouve. La question posée
    // à chaque commande produite est celle qu'on poserait à une PR de junior :
    // cette assertion peut-elle échouer ? ce sélecteur survit-il à un
    // changement de style ? cette attente est-elle déterministe ?
  });
});
