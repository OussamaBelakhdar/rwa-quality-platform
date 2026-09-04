/**
 * Connexion Auth0 par l'UI hébergée, enveloppée dans `cy.session` (ADR-009).
 *
 * ── Pourquoi l'UI et non `/oauth/token` ──
 * La première rédaction d'ADR-009 retenait le login programmatique, sur un
 * argument de coût qui s'est révélé faux : `cy.session` avec `cacheAcrossSpecs`
 * amortit déjà le login, et les 27 appels à `cy.login` de cette suite
 * produisent 11 connexions réelles, mesurées côté API. Le passage par l'UI se
 * paie donc onze fois, pas vingt-sept.
 *
 * Trois raisons achèvent de trancher :
 *   1. il ne demande aucun client secret — le chemin programmatique en exige
 *      un, et ce serait le premier vrai secret du projet ;
 *   2. seul le passage par l'UI exécute le retour de redirection —
 *      `handleRedirectCallback`, l'échange du `code`, la route d'arrivée. Le
 *      programmatique n'écrit jamais de `code` dans l'URL, donc ne le prouve
 *      jamais ;
 *   3. c'est ce que fait l'amont pour cette application exacte.
 *
 * ── Pourquoi des sélecteurs `#id` ──
 * Le corps de `cy.origin` s'exécute sur le domaine d'Auth0. Aucun `data-test`
 * n'y existe, et les commandes personnalisées ne franchissent pas la frontière
 * d'origine : `cy.getBySel` y est indisponible. Le hook n'applique la règle des
 * sélecteurs qu'aux specs — c'est précisément pourquoi ce bloc vit en L2 et non
 * dans la spec.
 */
Cypress.Commands.add("loginAuth0", () => {
  cy.task<{ username: string; password: string }>("getAuth0Credentials").then(
    ({ username, password }) => {
      cy.session(
        ["auth0", username],
        () => {
          cy.visit("/");
          cy.origin(
            Cypress.expose("auth0_origin"),
            { args: { username, password } },
            ({ username: identifiant, password: motDePasse }) => {
              // L'Universal Login d'Auth0 rend `input#username` quand la connexion
              // exige un nom d'utilisateur, et `input#email` sinon. Accepter les
              // deux évite d'imposer un réglage de tenant de plus — le fournisseur
              // local, lui, sert `#username`.
              cy.get("input#username, input#email").type(identifiant);
              // `log: false` : le mot de passe ne doit apparaître ni dans le
              // journal du runner, ni dans la vidéo d'un échec CI.
              cy.get("input#password").type(motDePasse, { log: false });
              cy.get("button[value=default]").click();
            }
          );

          // Auth0 interpose un écran de confirmation quand l'URI de rappel
          // n'est pas VÉRIFIABLE — `localhost` en est une. Il protège contre
          // l'usurpation d'application sur la même machine, et sa
          // documentation précise qu'il apparaît **même** avec « Allow
          // Skipping User Consent » activé sur l'API.
          //
          // Le fournisseur local ne le rend pas. Le test doit donc tolérer sa
          // présence ET son absence — sans quoi le chemin qui marche
          // aujourd'hui casserait le jour où un vrai tenant est branché, ou
          // l'inverse.
          //
          // La condition est évaluée DEHORS de `cy.origin`, une fois le
          // premier bloc terminé : après une connexion réussie sans
          // confirmation, le navigateur a déjà quitté l'origine d'Auth0, et
          // toute commande supplémentaire à l'intérieur du bloc échouerait sur
          // « expected to run against origin ». Le seul endroit sûr pour
          // décider est ici.
          cy.url().then((url) => {
            const origineAuth0 = Cypress.expose("auth0_origin");
            if (!url.startsWith(origineAuth0)) return;
            cy.origin(origineAuth0, () => {
              cy.get("button[value=accept]").click();
            });
          });

          // Preuve que le retour de redirection a été traité : sans
          // `onRedirectCallback` câblé, l'URL garderait `?code=…&state=…`.
          cy.url().should("equal", `${Cypress.config("baseUrl")}/`);
        },
        {
          /**
           * `authState` est écrit par `authMachine` une fois la machine passée
           * en `authorized`. Sa présence prouve que le jeton a traversé le SDK
           * ET la machine — pas seulement qu'Auth0 a répondu.
           */
          validate: () => {
            cy.window().its("localStorage").invoke("getItem", "authState").should("exist");
          },
          cacheAcrossSpecs: true,
        }
      );
    }
  );
});

export {};
