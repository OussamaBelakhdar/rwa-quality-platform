#!/usr/bin/env node
/**
 * Exécute la suite N fois et calcule un taux d'échec par test — mesure de
 * flakiness (P4 : le flake est un bug, pas un aléa).
 *
 *     yarn cy:burn                          # 10 exécutions
 *     CY_BURN_RUNS=20 yarn cy:burn          # 20 exécutions
 *     yarn cy:burn --spec cypress/e2e/...   # cibler une spec
 *
 * Deux choix de conception à connaître avant de lire les chiffres :
 *
 * 1. Les retries sont FORCÉS À ZÉRO. En mode normal `retries.runMode: 2`
 *    masque un test instable en le rejouant. Un burn qui hérite des retries
 *    mesure la qualité du filet, pas celle du test. Ici on veut la seconde.
 *
 * 2. Un test qui échoue à TOUTES les exécutions n'est pas flaky, il est
 *    cassé. Le rapport les sépare : confondre les deux envoie chercher une
 *    condition de course là où il y a un bug déterministe.
 *
 * DÉFINITION DU TAUX — nombre de tests ayant échoué au moins une fois mais pas
 * à toutes les exécutions, divisé par le nombre de tests observés. Ce n'est pas
 * la même chose que la définition du §8 d'ARCHITECTURE.md (« tests échouant
 * puis passant au retry / total »), qui suppose les retries actifs — or ce
 * script les désactive. Les deux se défendent ; celle-ci est retenue parce
 * qu'elle mesure le test, pas le filet. La gate §6 fixe le seuil à 2 %.
 */
const cypress = require("cypress");

const RUNS = Number(process.env.CY_BURN_RUNS || 10);
const SEUIL_POURCENT = 2;

/** Récupère un --spec éventuel passé derrière la commande. */
function specDepuisArgv() {
  const i = process.argv.indexOf("--spec");
  return i !== -1 ? process.argv[i + 1] : undefined;
}

(async () => {
  const spec = specDepuisArgv();
  /** @type {Map<string, {echecs: number, retries: number}>} */
  const stats = new Map();
  let executionsCompletes = 0;
  /** @type {number | null} */
  let testsAttendus = null;

  console.log(`\nBurn — ${RUNS} exécutions, retries désactivés${spec ? `, spec ${spec}` : ""}\n`);

  for (let run = 1; run <= RUNS; run++) {
    const resultat = await cypress.run({
      e2e: true,
      quiet: true,
      reporter: "dot",
      spec,
      config: { retries: { runMode: 0, openMode: 0 } },
    });

    if (resultat.status === "failed") {
      console.error(`Exécution ${run} : Cypress n'a pas pu démarrer — ${resultat.message}`);
      process.exit(1);
    }

    executionsCompletes += 1;
    const testsDeCeRun = resultat.runs.reduce((n, r) => n + r.tests.length, 0);
    if (testsAttendus === null) {
      testsAttendus = testsDeCeRun;
    } else if (testsDeCeRun !== testsAttendus) {
      // Une spec qui ne compile pas ne produit aucun test : elle disparaîtrait
      // du dénominateur et un « 0 % de flake » couvrirait moins de specs
      // qu'annoncé.
      console.error(
        `Exécution ${run} : ${testsDeCeRun} tests observés contre ${testsAttendus} attendus — une spec a disparu du run.`
      );
      process.exit(1);
    }
    for (const specRun of resultat.runs) {
      for (const test of specRun.tests) {
        // Préfixer par la spec : deux `it` homonymes dans deux fichiers
        // différents fusionneraient sinon en une seule ligne de rapport.
        const titre = `${specRun.spec.relative} › ${test.title.join(" › ")}`;
        const e = stats.get(titre) || { echecs: 0, retries: 0 };
        if (test.state === "failed") e.echecs += 1;
        if ((test.attempts?.length ?? 1) > 1) e.retries += 1;
        stats.set(titre, e);
      }
    }
    const echecsDuRun = resultat.totalFailed;
    console.log(
      `  exécution ${String(run).padStart(2)}/${RUNS} — ${resultat.totalPassed} passés, ${echecsDuRun} échoués`
    );
  }

  const lignes = [...stats.entries()]
    .map(([titre, e]) => ({ titre, ...e, taux: (e.echecs / executionsCompletes) * 100 }))
    .sort((a, b) => b.taux - a.taux);

  const casses = lignes.filter((l) => l.echecs === executionsCompletes);
  const flaky = lignes.filter((l) => l.echecs > 0 && l.echecs < executionsCompletes);

  console.log(`\n${"─".repeat(76)}`);
  console.log(`Tests observés : ${lignes.length} sur ${executionsCompletes} exécutions\n`);

  if (casses.length) {
    console.log("CASSÉS (échouent à chaque exécution — bug déterministe, pas du flake) :");
    casses.forEach((l) => console.log(`  ${l.echecs}/${executionsCompletes}  ${l.titre}`));
    console.log("");
  }

  if (flaky.length) {
    console.log("FLAKY (échouent parfois) :");
    flaky.forEach((l) =>
      console.log(
        `  ${l.taux.toFixed(1).padStart(5)}%  (${l.echecs}/${executionsCompletes})  ${l.titre}`
      )
    );
    console.log("");
  }

  if (!casses.length && !flaky.length) {
    console.log(`Aucun échec sur ${executionsCompletes} exécutions.\n`);
  }

  const tauxGlobal = (flaky.length / (lignes.length || 1)) * 100;
  console.log(`Taux de flake : ${tauxGlobal.toFixed(2)} % (seuil §6 : ${SEUIL_POURCENT} %)`);
  console.log(`${"─".repeat(76)}\n`);

  if (casses.length) {
    console.error("Des tests sont cassés : corriger avant de parler de flakiness.");
    process.exit(1);
  }
  if (tauxGlobal > SEUIL_POURCENT) {
    console.error(
      `Gate §6 rouge : ${tauxGlobal.toFixed(2)} % > ${SEUIL_POURCENT} %. Invoquer le skill flake-diagnosis.`
    );
    process.exit(1);
  }
  process.exit(0);
})();
