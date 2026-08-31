# Semaine 1 — brouillon LinkedIn

Premier `cy.login` de mon projet : un `cy.request('POST /login')`. Propre, rapide, programmatique — la bonne pratique qu'on lit partout.

Les quatre tests ont échoué. `Expected to find element: [data-test=transaction-list]`.

Le cookie de session était bien posé. Le serveur me connaissait. L'application, non.

En lisant `authMachine.ts` ligne 265 : l'état d'authentification de cette app ne vit pas dans le cookie. Il est persisté par la machine XState dans `localStorage.authState`, et rechargé au démarrage. Un login purement HTTP laisse l'interface déconnectée — le serveur et le client ne sont simplement pas d'accord sur qui je suis.

C'est exactement pour ça que l'équipe Cypress avait écrit `loginByXstate` dans ce dépôt. Je l'avais lu. Je ne l'avais pas compris.

Le chiffre : **19 tests, 12 secondes, 3 exécutions consécutives vertes.**

Mais celui qui compte est ailleurs. Sur cette application, l'app action n'est pas une optimisation de confort. C'est le seul chemin qui produit un état cohérent. J'avais écrit un ADR pour justifier ce choix ; c'est l'échec de quatre tests qui l'a démontré.

Vous, vous vérifiez quoi avant de déclarer qu'un login programmatique fonctionne ?
