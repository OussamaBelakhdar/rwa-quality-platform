import type { Auth0ProviderOptions } from "@auth0/auth0-react";

/**
 * Options du `Auth0Provider`, extraites pour être TYPÉES.
 *
 * Ce fichier existe pour une raison précise (ADR-009, défaut 2). Le SDK
 * `@auth0/auth0-react` est passé en 2.x, où `audience` et `scope` ont quitté le
 * premier niveau pour `authorizationParams`. Passées au premier niveau, elles
 * sont perdues en silence : le jeton n'a pas d'audience d'API, et
 * `checkAuth0Jwt` répond 401 à chaque appel — dont la cause apparente serait
 * une mauvaise configuration du tenant.
 *
 * TypeScript aurait signalé ces props invalides. Il ne l'a pas fait parce que
 * `src/index.auth0.tsx` n'entre pas dans le programme de `yarn types` : le
 * `include` de `tsconfig.json` ne couvre `src/` que par les composants ayant un
 * test de composant. L'y ajouter tirerait tout le graphe de l'application et
 * ses 25 erreurs latentes — un chantier à part, pas une note de bas de page.
 *
 * Ce module-ci, lui, n'importe que les types du SDK. Il est donc inclus dans
 * `yarn types` sans rien tirer d'autre, et l'annotation `Auth0ProviderOptions`
 * casse la compilation si les options dérivent à nouveau de l'API du SDK.
 */
export const auth0ProviderOptions = (origin: string): Auth0ProviderOptions => ({
  domain: process.env.VITE_AUTH0_DOMAIN!,
  clientId: process.env.VITE_AUTH0_CLIENTID!,
  authorizationParams: {
    redirect_uri: origin,
    audience: process.env.VITE_AUTH0_AUDIENCE,
    scope: process.env.VITE_AUTH0_SCOPE,
  },
  cacheLocation: "localstorage",
});
