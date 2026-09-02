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
    .map((v) => `  [${v.impact}] ${v.id} — ${v.nodes.length} nœud(s) : ${v.help}`)
    .join("\n");

export const verifierAccessibilite = (page: string): void => {
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
      const bloquantes = violations.filter((v) => BLOQUANTES.includes(String(v.impact)));
      expect(
        bloquantes,
        `violations critical/serious sur ${page} :\n${resume(bloquantes)}`
      ).to.have.length(0);
    },
    // `skipFailures` : l'échec est prononcé par l'assertion ci-dessus, sur les
    // seules violations bloquantes. Laisser cypress-axe échouer lui-même
    // rendrait la gate §6 inapplicable — il refuse tout, `minor` compris.
    true
  );
};
