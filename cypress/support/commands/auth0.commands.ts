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
import type { TaskMap } from "@plugins/index";

Cypress.Commands.add("loginAuth0", () => {
  // Type DÉRIVÉ du contrat, pas réécrit : `.claude/rules/typescript.md` impose
  // que l'entrée et la sortie d'une tâche viennent de `TaskMap`. Un type inline
  // compile aussi bien et ment le jour où la tâche change.
  cy.task<TaskMap["getAuth0Credentials"]["sortie"]>("getAuth0Credentials").then(
    ({ username, password }) => {
      cy.session(
        ["auth0", username],
        () => {
          // `timeout` BORNÉ, et c'est la leçon la plus chère de la semaine.
          //
          // Quand le tenant refuse la demande — audience inconnue, callback non
          // autorisé — il renvoie vers l'application avec `?error=…`.
          // `withAuthenticationRequired` retente aussitôt, et les deux se
          // renvoient la balle : la page ne finit JAMAIS de charger. Sans borne,
          // `cy.visit` attend indéfiniment et le run ne rend pas la main —
          // constaté trois fois, dix minutes à chaque fois, sans une ligne de
          // diagnostic.
          //
          // Trente secondes suffisent largement à un aller-retour honnête. Au
          // delà, c'est une boucle, et un échec vaut mieux qu'une attente.
          cy.visit("/", { timeout: 30000 });

          // Un refus du tenant revient par l'URL, pas par une exception.
          //
          // Auth0 redirige vers l'application avec `?error=…&error_description=…`
          // quand la demande est invalide — audience inconnue, callback non
          // autorisé, client désactivé. `withAuthenticationRequired` retente
          // alors, et le couple redirige en boucle : le test n'échoue pas, il
          // ne REND JAMAIS LA MAIN. Constaté ici — dix minutes, aucune sortie,
          // aucune cause.
          //
          // La cause était pourtant écrite dans l'URL. On la lit.
          cy.location("search").then((query) => {
            const params = new URLSearchParams(query);
            const erreur = params.get("error");
            if (!erreur) return;
            throw new Error(
              `Le tenant Auth0 a refusé la demande d'autorisation : ${erreur} — ` +
                `${params.get("error_description") || "sans description"}. ` +
                `« Service not found » signifie que \`VITE_AUTH0_AUDIENCE\` ne correspond à ` +
                `aucune API du tenant : c'est l'IDENTIFIER de l'API qu'il faut, pas son nom ` +
                `(Applications → APIs, colonne « API Audience »). Voir ADR-009, prérequis du tenant.`
            );
          });

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
              // `.should()` et non `.then()` : la version précédente prenait un
              // INSTANTANÉ du DOM. Un écran encore en cours de rendu — le cas
              // normal contre un tenant distant — donnait `length === 0` et
              // levait « écran inconnu » alors que l'écran était bien là, juste
              // lent. Un test qui échoue sur une lenteur est un flake, et la
              // règle #10 l'interdit sur la spec censée prouver la fiabilité du
              // SSO. `.should()` réessaie jusqu'au délai ; l'erreur nommée ne
              // survient donc que si l'écran est RÉELLEMENT différent.
              cy.get("body", { timeout: 15000 }).should(($corps) => {
                if ($corps.find("button[value=accept]").length > 0) return;

                // Rester sur l'origine d'Auth0 ne veut PAS dire « écran
                // intermédiaire ». Le cas le plus fréquent est le formulaire
                // REAFFICHÉ avec une erreur — identifiants faux, compte bloqué.
                // La première version concluait « confirmation de connexion »
                // dans tous les cas, et envoyait chercher un réglage de tenant
                // alors que le mot de passe était simplement mauvais. Un
                // message sûr de lui qui se trompe coûte plus cher qu'un
                // message vague.
                const texte = $corps.text();
                const erreurConnexion =
                  /wrong email or password|identifiant|mot de passe incorrect/i;
                if (erreurConnexion.test(texte) || $corps.find("input#password").length > 0) {
                  throw new Error(
                    "Auth0 a REFUSÉ les identifiants : le formulaire de connexion est toujours " +
                      "affiché. Vérifier `AUTH0_USERNAME` et `AUTH0_PASSWORD` dans `.env.local` — " +
                      "`AUTH0_USERNAME` doit être l'ADRESSE E-MAIL de l'utilisateur créé dans " +
                      "User Management → Users, pas un identifiant de client ni un secret. " +
                      "Vérifier aussi que cet utilisateur existe bien dans la connexion " +
                      "`Username-Password-Authentication`."
                  );
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
              // L'assertion ci-dessus garantit que le bouton EXISTE avant qu'on
              // le cherche : ce `cy.get` ne peut donc plus courir après un
              // rendu en retard.
              cy.get("button[value=accept]").first().click();
            });
          });

          // Preuve que le retour de redirection a été traité : sans
          // `onRedirectCallback` câblé, l'URL garderait `?code=…&state=…`.
          cy.url().should("equal", `${Cypress.config("baseUrl")}/`);
        },
        {
          /**
           * Vérifie le CONTENU de `authState`, pas seulement sa présence.
           *
           * La première rédaction se contentait de `.should("exist")` en
           * prétendant prouver « que le jeton a traversé le SDK ET la
           * machine ». Faux : un état sérialisé `unauthorized` — après une
           * déconnexion, ou une session expirée — existe tout autant, et le
           * cache aurait été jugé valide à tort.
           *
           * `authMachine` persiste `JSON.stringify(state)` à chaque transition
           * (`authMachine.ts:279`), et l'application rejoue cet état au
           * démarrage via `resolveState` (`:270-273`). C'est donc exactement
           * cette valeur qui décide si l'application est connectée : l'assertion
           * porte enfin sur ce qui compte.
           */
          validate: () => {
            cy.window()
              .its("localStorage")
              .invoke("getItem", "authState")
              .should("be.a", "string")
              .then((brut) => {
                const etat: unknown = JSON.parse(String(brut));
                const valeur =
                  typeof etat === "object" && etat !== null
                    ? (etat as { value?: unknown }).value
                    : undefined;
                expect(valeur, "état persisté d'authMachine").to.equal("authorized");
              });
          },
          cacheAcrossSpecs: true,
        }
      );
    }
  );
});

export {};
