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

          // Auth0 peut interposer un écran après la saisie des identifiants.
          // Il y en a DEUX, distincts, et les confondre mène à viser le mauvais
          // bouton :
          //
          //   1. le CONSENTEMENT — bouton `value=accept`. Pour une application
          //      first-party il n'apparaît pas, sauf `prompt=consent` explicite,
          //      et « Allow Skipping User Consent » le supprime ;
          //   2. la CONFIRMATION DE CONNEXION — affichée quand l'URI de rappel
          //      n'est pas vérifiable, ce qu'est une URI de BOUCLAGE comme
          //      `http://localhost:3000`. Elle protège de l'usurpation
          //      d'application sur la même machine, « Allow Skipping User
          //      Consent » ne la supprime PAS, et Auth0 n'en documente pas le
          //      balisage.
          //
          // Le premier est traité. Le second **n'a pas à l'être** : il se
          // désactive par un réglage documenté, « Non-Verifiable Callback URI
          // End-User Confirmation », au niveau du tenant ou de l'APPLICATION —
          // le niveau application primant. Le désactiver sur la seule
          // application de test est préférable à deviner un sélecteur jamais
          // vu : un test qui clique au hasard sur une page inconnue est un test
          // qui ment.
          //
          // Auth0 déconseille de le désactiver, et il a raison — pour une
          // application de production servie sur un vrai domaine. Ici l'URI de
          // bouclage n'existe que parce que la suite tourne en local ; la
          // recommandation vise un risque que ce contexte n'a pas.
          //
          // Reste le filet : si l'écran apparaît quand même, l'échec se NOMME
          // et donne le réglage à changer, au lieu d'un timeout de 4 s.
          //
          // La condition est évaluée DEHORS de `cy.origin` : après une
          // connexion réussie sans écran intermédiaire, le navigateur a déjà
          // quitté l'origine d'Auth0, et toute commande supplémentaire dans le
          // bloc échouerait sur « expected to run against origin ».
          cy.url().then((url) => {
            const origineAuth0 = Cypress.expose("auth0_origin");
            if (!url.startsWith(origineAuth0)) return;
            cy.origin(origineAuth0, () => {
              cy.get("body").then(($corps) => {
                const accepter = $corps.find("button[value=accept]");
                if (accepter.length) {
                  cy.wrap(accepter.first()).click();
                  return;
                }
                throw new Error(
                  "Auth0 a interposé un écran que `cy.loginAuth0()` ne sait pas franchir. " +
                    "Le bouton de CONSENTEMENT (`button[value=accept]`) est absent : c'est donc " +
                    "la CONFIRMATION DE CONNEXION, affichée parce que `http://localhost:3000` " +
                    "est une URI de bouclage. À CORRIGER SUR LE TENANT, pas dans ce fichier : " +
                    "Applications → (l'application de test) → Advanced Settings → OAuth → " +
                    "« Non-Verifiable Callback URI End-User Confirmation » → Skip. " +
                    "Le réglage existe aussi au niveau du tenant ; celui de l'application prime. " +
                    "Voir ADR-009, section « prérequis du tenant »."
                );
              });
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
