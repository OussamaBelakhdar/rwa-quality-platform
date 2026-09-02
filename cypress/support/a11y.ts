import type { Result } from "axe-core";

/**
 * Audit d'accessibilité d'une page — couche L2.
 *
 * Vit ici et non dans une spec pour deux raisons. D'abord `cy.task` : la
 * règle #3 l'interdit dans une spec, et le relevé des violations doit sortir
 * sur le terminal, pas seulement dans le Command Log. Ensuite le SEUIL : il
 * est décidé à un seul endroit, sinon chaque spec choisirait le sien.
 *
 * Seules les violations `critical` et `serious` échouent — gate §6
 * d'ARCHITECTURE.md. Les `moderate` et `minor` sont relevées et publiées, pas
 * bloquantes : une gate qu'on ne peut pas tenir se contourne.
 */
const BLOQUANTES = ["critical", "serious"];

const resume = (violations: Result[]): string =>
  violations
    .map((v) => {
      // Les cibles sont imprimées : sans elles, le relevé dit QU'IL y a une
      // violation sans dire OÙ, et il faut rouvrir le navigateur pour agir.
      const cibles = v.nodes
        .slice(0, 3)
        .map(
          (n) => `      ${n.target.join(" ")}
        ${String(n.html).slice(0, 160)}`
        )
        .join("\n");
      const reste = v.nodes.length > 3 ? `\n      … et ${v.nodes.length - 3} autre(s)` : "";
      return `  [${v.impact}] ${v.id} — ${v.nodes.length} nœud(s) : ${v.help}\n${cibles}${reste}`;
    })
    .join("\n");

/**
 * @param page   nom lisible, pour le relevé
 * @param connues identifiants de règles axe déjà présentes au moment de
 *   l'adoption. Elles sont RELEVÉES mais ne bloquent pas.
 *
 * Pourquoi une base de référence plutôt qu'un seuil à zéro : l'application
 * amont a des violations antérieures à ce projet. Exiger zéro dès le premier
 * jour rendrait la gate intenable, et une gate intenable se désactive. La base
 * rend le contrat exécutable dès aujourd'hui, à deux conditions :
 *
 *   1. **Toute violation NOUVELLE échoue.** C'est le seul point qui compte au
 *      quotidien : le code écrit maintenant n'a pas le droit d'en ajouter.
 *   2. **La base ne peut que rétrécir.** Si une règle listée disparaît, le test
 *      ÉCHOUE aussi, en demandant de la retirer de la liste. Sans cela, la
 *      base pourrirait en liste de dérogations que plus personne ne relit —
 *      exactement ce qu'un `@quarantine` sans ticket daté deviendrait.
 */
export const verifierAccessibilite = (page: string, connues: string[] = []): void => {
  cy.injectAxe();
  cy.checkA11y(
    undefined,
    undefined,
    (violations) => {
      cy.task(
        "log",
        `\n=== a11y : ${page} — ${violations.length} violation(s) ===\n${resume(violations)}`,
        {
          log: false,
        }
      );

      const nouvelles = violations.filter(
        (v) => BLOQUANTES.includes(String(v.impact)) && !connues.includes(v.id)
      );
      expect(nouvelles, `violations NOUVELLES sur ${page} :\n${resume(nouvelles)}`).to.have.length(
        0
      );

      const disparues = connues.filter((id) => !violations.some((v) => v.id === id));
      expect(
        disparues,
        `règles corrigées sur ${page} — les retirer de la base de référence : ${disparues.join(", ")}`
      ).to.have.length(0);
    },
    // L'échec est prononcé par les deux assertions ci-dessus. Laisser
    // cypress-axe échouer lui-même rendrait la base inopérante : il refuse
    // tout, `minor` compris.
    true
  );
};
