/**
 * Types manquants de `vite-plugin-eslint`.
 *
 * Le paquet PUBLIE ses types (`dist/index.d.ts`) mais ne les déclare pas dans
 * son champ `exports` : sous `moduleResolution: "bundler"`, TypeScript ne les
 * trouve pas. Le message de tsc le dit lui-même — « The library may need to
 * update its package.json or typings ». Le défaut est chez lui.
 *
 * ── Pourquoi un fichier séparé et non `cypress.d.ts` ──
 * `cypress.d.ts` porte des imports en tête : c'est donc un MODULE, et un
 * `declare module "x"` y AUGMENTE un module existant au lieu d'en déclarer un.
 * Le shim y était sans effet. Un fichier sans import de premier niveau est un
 * script, et sa déclaration est ambiante — la nuance coûte une demi-heure quand
 * on ne la connaît pas.
 *
 * ── Pourquoi pas `any` ──
 * La règle du projet l'interdit (.claude/rules/typescript.md), et l'exception
 * ne se justifierait pas ici : on n'utilise que l'appel par défaut, dont la
 * signature réelle tient en une ligne.
 */
declare module "vite-plugin-eslint" {
  const eslintPlugin: (options?: Record<string, unknown>) => import("vite").Plugin;
  export default eslintPlugin;
}
