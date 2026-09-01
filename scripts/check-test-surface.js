#!/usr/bin/env node
/**
 * Gate de surface de test — la dette que portaient ADR-006 et ADR-007.
 *
 * Vérifie qu'un artefact de PRODUCTION n'embarque aucune des deux surfaces de
 * test ouvertes par ce projet :
 *   1. le registre XState `window.__services__` (ADR-006), côté front ;
 *   2. les routes `/testData` (ADR-007), côté back.
 *
 * POURQUOI PAS UN GREP — ADR-006 le proposait, puis l'implémentation l'a
 * démenti : `__services__` EST présent dans le bundle par défaut (Vite
 * remplace une expression, il ne supprime pas un module importé), alors que la
 * garde est bien fausse à l'exécution. Un grep produirait un faux positif
 * permanent, donc un gate qu'on finit par désactiver. Ces deux contrôles sont
 * faits AU RUNTIME, sur l'artefact réellement servi.
 *
 * ASYMÉTRIE ASSUMÉE (ADR-007) : la garde front est figée au build, la garde
 * back est une variable d'environnement — donc plus faible. Les deux sont
 * vérifiées ici de la même façon, ce qui ne réduit pas l'écart mais le rend
 * visible.
 */
const { spawn, spawnSync } = require("child_process");
const http = require("http");

const PORT_PREVIEW = 4173;
const PORT_API = 3001;
const enfants = [];

const lancer = (commande, args, env) => {
  const p = spawn(commande, args, { env: { ...process.env, ...env }, stdio: "ignore" });
  enfants.push(p);
  return p;
};

const arreter = () => enfants.forEach((p) => p.kill("SIGTERM"));

const attendre = (port, chemin, msMax = 45000) =>
  new Promise((resolve, reject) => {
    const debut = Date.now();
    const essayer = () => {
      http
        .get({ host: "localhost", port, path: chemin, timeout: 2000 }, (res) =>
          resolve(res.statusCode)
        )
        .on("error", () =>
          Date.now() - debut > msMax
            ? reject(new Error(`Rien n'écoute sur :${port}${chemin} après ${msMax / 1000} s`))
            : setTimeout(essayer, 1000)
        );
    };
    essayer();
  });

const statut = (port, chemin, methode = "GET") =>
  new Promise((resolve, reject) => {
    const req = http.request(
      { host: "localhost", port, path: chemin, method: methode, timeout: 5000 },
      (res) => {
        res.resume();
        resolve(res.statusCode);
      }
    );
    req.on("error", reject);
    req.end();
  });

const etape = (ok, libelle, detail) => {
  console.log(`  ${ok ? "✔" : "✖"} ${libelle}${detail ? ` — ${detail}` : ""}`);
  return ok;
};

(async () => {
  let succes = true;
  try {
    console.log("\nGate de surface de test\n");

    // ── 1. Front : build SANS le drapeau, servi, registre absent ──
    console.log("1. Registre XState (ADR-006)");
    const build = spawnSync("yarn", ["build"], { stdio: "ignore" });
    if (build.status !== 0) throw new Error("`yarn build` a échoué");

    lancer("npx", ["vite", "preview", "--port", String(PORT_PREVIEW)]);
    await attendre(PORT_PREVIEW, "/");

    // Sans supportFile : aucune commande du projet n'est chargée, donc rien
    // ne peut masquer ce qu'on vérifie.
    // Configuration dédiée (cypress.gate.config.ts) : sans supportFile, donc
    // aucune commande du projet n'est chargée et rien ne peut masquer ce qu'on
    // vérifie. Un override `--config supportFile=false` ne suffit pas :
    // `supportFile` vit dans le bloc `e2e`, hors de portée d'un override de
    // premier niveau. Constaté — le support se chargeait, et son `before()`
    // global faisait échouer le gate en réclamant `yarn dev:test`.
    const gate = spawnSync(
      "npx",
      [
        "cypress",
        "run",
        "--e2e",
        "--browser",
        "electron",
        "--config-file",
        "cypress.gate.config.ts",
      ],
      { stdio: "ignore" }
    );
    succes = etape(gate.status === 0, "window.__services__ absent du build par défaut") && succes;
    arreter();

    // ── 2. Back : NODE_ENV=production, /testData injoignable ──
    console.log("\n2. Routes /testData (ADR-007)");
    lancer("yarn", ["start:api"], { NODE_ENV: "production" });
    await attendre(PORT_API, "/checkAuth");

    const controle = await statut(PORT_API, "/checkAuth");
    succes =
      etape(controle === 401, "le serveur tourne bien", `/checkAuth → ${controle}`) && succes;

    for (const [methode, chemin] of [
      ["POST", "/testData/seed"],
      ["POST", "/testData/user"],
      ["POST", "/testData/transaction"],
      ["GET", "/testData/users"],
    ]) {
      const code = await statut(PORT_API, chemin, methode);
      succes = etape(code === 404, `${methode} ${chemin} injoignable`, `HTTP ${code}`) && succes;
    }
  } catch (erreur) {
    console.error(`\n✖ ${erreur.message}`);
    succes = false;
  } finally {
    arreter();
  }

  console.log(
    succes
      ? "\nAucune surface de test dans l'artefact de production.\n"
      : "\nSURFACE DE TEST DÉTECTÉE.\n"
  );
  process.exit(succes ? 0 : 1);
})();
