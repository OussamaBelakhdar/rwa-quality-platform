#!/usr/bin/env node
/**
 * Fait respecter la gate §6 d'`ARCHITECTURE.md` sur la quarantaine :
 * « ≤ 5 tests, chacun avec ticket daté < 14 j ».
 *
 * Sans ce script, cette ligne du tableau des gates était déclarative — comme
 * l'était « issue auto si rouge » avant la semaine 6. Une quarantaine sans
 * échéance n'est pas une quarantaine, c'est une suppression polie : le test
 * cesse de protéger quoi que ce soit et personne ne le remarque.
 *
 * Ce qui est vérifié, pour chaque bloc portant `@quarantine` :
 *   1. un commentaire `// QUARANTINE: #<issue> <AAAA-MM-JJ>` l'accompagne
 *      (règle #6 de .claude/rules/testing.md) ;
 *   2. la date n'a pas plus de 14 jours ;
 *   3. le total ne dépasse pas 5 blocs.
 *
 * INTERPRÉTATION assumée : §6 parle de « 5 tests », le script compte les BLOCS
 * tagués. Un `describe` tagué met en quarantaine tous ses `it` d'un coup ; le
 * script le signale, parce qu'un seul tag peut éteindre dix tests sans que le
 * compteur bouge.
 */
const fs = require("fs");
const path = require("path");

const RACINE = path.join(__dirname, "..");
const SUITE = [path.join(RACINE, "cypress", "e2e"), path.join(RACINE, "cypress", "api")];
const PLAFOND = 5;
const JOURS_MAX = 14;

const specs = (dir) => {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const complet = path.join(dir, e.name);
    if (e.isDirectory()) return specs(complet);
    return /\.cy\.tsx?$/.test(e.name) ? [complet] : [];
  });
};

const TICKET = /\/\/\s*QUARANTINE:\s*#(\d+)\s+(\d{4}-\d{2}-\d{2})/;
const problemes = [];
const blocs = [];

for (const fichier of SUITE.flatMap(specs)) {
  const lignes = fs.readFileSync(fichier, "utf8").split("\n");
  lignes.forEach((ligne, i) => {
    if (!/@quarantine/.test(ligne)) return;
    const relatif = `${path.relative(RACINE, fichier)}:${i + 1}`;

    // Le ticket est cherché dans les 3 lignes qui précèdent ET la ligne même :
    // les deux placements se rencontrent en revue, et exiger l'un des deux
    // ferait échouer une quarantaine par ailleurs correcte.
    const voisinage = lignes.slice(Math.max(0, i - 3), i + 2).join("\n");
    const ticket = TICKET.exec(voisinage);

    // Un `describe` tagué éteint tous ses `it` d'un coup, sans que le compteur
    // le montre. On le dit plutôt que de le laisser passer en silence.
    const surDescribe = /describe\(/.test(lignes.slice(Math.max(0, i - 2), i + 3).join("\n"));
    blocs.push({ relatif, surDescribe });

    if (!ticket) {
      problemes.push(`${relatif} — @quarantine sans « // QUARANTINE: #<issue> <AAAA-MM-JJ> »`);
      return;
    }
    const jours = Math.floor((Date.now() - Date.parse(ticket[2])) / 86400000);
    if (Number.isNaN(jours)) {
      problemes.push(`${relatif} — date illisible : ${ticket[2]}`);
    } else if (jours > JOURS_MAX) {
      problemes.push(
        `${relatif} — ticket #${ticket[1]} daté du ${ticket[2]}, soit ${jours} jours : au-delà de ${JOURS_MAX}`
      );
    }
  });
}

if (blocs.length > PLAFOND) {
  problemes.push(`${blocs.length} blocs en quarantaine, plafond §6 : ${PLAFOND}`);
}

if (problemes.length) {
  console.error("\nquarantaine — gate §6 refusée :");
  problemes.forEach((p) => console.error(`  ${p}`));
  console.error("");
  process.exit(1);
}

const surDescribe = blocs.filter((b) => b.surDescribe).length;
const detail = surDescribe ? `, dont ${surDescribe} sur un describe (éteint tous ses it)` : "";
console.log(
  blocs.length === 0
    ? "quarantaine : aucun bloc — la suite protège tout ce qu'elle couvre."
    : `quarantaine : ${blocs.length}/${PLAFOND} bloc(s), tickets valides et datés de moins de ${JOURS_MAX} jours${detail}.`
);
