#!/usr/bin/env node
/**
 * Vérifie que les citations `fichier.ts:ligne` de la documentation pointent
 * encore quelque part.
 *
 * Pourquoi : en semaine 5, quatre citations sont devenues fausses parce que
 * MES PROPRES correctifs avaient décalé les lignes citées. Personne ne l'aurait
 * vu — une référence périmée ne casse aucun test, elle se contente d'envoyer
 * le lecteur au mauvais endroit. C'est le même piège que la semaine 4 : un
 * document qui a l'air juste et qui ne l'est plus.
 *
 * Ce que ce script PEUT vérifier : le fichier existe, la ligne existe, et elle
 * n'est pas vide. Ce qu'il NE PEUT PAS vérifier : que la ligne dit encore ce
 * que la doc prétend. D'où la règle de rédaction qui l'accompagne — citer un
 * SYMBOLE (`showEmptyList`) plutôt qu'un numéro quand c'est possible, parce
 * qu'un nom ne se décale pas. Le script est le filet, pas la méthode.
 */
const fs = require("fs");
const path = require("path");

// Racine SURCHARGEABLE. `check-gates.js` fait tourner cette gate contre un
// arbre de test pour prouver que chacune de ses règles rejette encore ce
// qu'elle existe pour rejeter. Sans ce point d'entrée, prouver une gate
// obligerait à muter le vrai dépôt — ce que j'ai fait à la main, dans le
// terminal, et dont il ne restait rien le lendemain.
const RACINE = process.env.GATE_ROOT
  ? path.resolve(process.env.GATE_ROOT)
  : path.join(__dirname, "..");
const SOURCES = ["docs", "cypress", "README.md"];
const CITATION = /`((?:[\w./-]+\/)?[\w.-]+\.(?:ts|tsx|js|json))(?::(\d+)(?:-(\d+))?)`/g;

function fichiersDoc(cible) {
  const complet = path.join(RACINE, cible);
  if (!fs.existsSync(complet)) return [];
  if (fs.statSync(complet).isFile()) return [complet];
  return fs.readdirSync(complet, { withFileTypes: true }).flatMap((e) => {
    const enfant = path.join(cible, e.name);
    if (e.isDirectory()) return fichiersDoc(enfant);
    return /\.(md|ts|tsx)$/.test(e.name) ? [path.join(RACINE, enfant)] : [];
  });
}

/** Un même basename peut exister à plusieurs endroits ; on indexe par nom. */
const index = new Map();
(function indexer(dossier) {
  for (const e of fs.readdirSync(dossier, { withFileTypes: true })) {
    if (["node_modules", ".git", "build", "dist", "coverage"].includes(e.name)) continue;
    const complet = path.join(dossier, e.name);
    if (e.isDirectory()) indexer(complet);
    else index.set(e.name, (index.get(e.name) || []).concat(complet));
  }
})(RACINE);

const problemes = [];
let verifiees = 0;

for (const source of SOURCES) {
  for (const fichier of fichiersDoc(source)) {
    const lignes = fs.readFileSync(fichier, "utf8").split("\n");
    lignes.forEach((ligne, i) => {
      for (const m of ligne.matchAll(CITATION)) {
        const [, cite, debut, fin] = m;
        if (!debut) continue; // citation sans numéro : rien à vérifier, et c'est la forme préférée
        const base = path.basename(cite);
        const candidats = (index.get(base) || []).filter((c) =>
          c.endsWith(cite.replace(/^\.\//, ""))
        );
        const ou = `${path.relative(RACINE, fichier)}:${i + 1}`;
        if (!candidats.length) {
          // RÈGLE: fichier-introuvable
          problemes.push(`${ou} → \`${cite}\` : fichier introuvable`);
          continue;
        }
        verifiees += 1;
        const contenu = fs.readFileSync(candidats[0], "utf8").split("\n");
        const derniere = Number(fin || debut);
        if (derniere > contenu.length) {
          // RÈGLE: ligne-hors-fichier
          problemes.push(
            `${ou} → \`${cite}:${debut}${fin ? `-${fin}` : ""}\` : le fichier n'a que ${contenu.length} lignes`
          );
        } else if (!contenu[Number(debut) - 1].trim()) {
          // RÈGLE: ligne-vide
          problemes.push(`${ou} → \`${cite}:${debut}\` : la ligne citée est vide`);
        }
      }
    });
  }
}

if (problemes.length) {
  console.error("références périmées :");
  for (const p of problemes) console.error(`  ${p}`);
  process.exit(1);
}
console.log(
  `références : ${verifiees} citations avec numéro de ligne pointent sur une ligne existante.`
);
