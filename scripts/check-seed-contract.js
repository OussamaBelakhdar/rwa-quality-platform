#!/usr/bin/env node
/**
 * Vérifie que `data/database-seed.json` respecte le contrat de forme que
 * l'application suppose.
 *
 * Pourquoi ce contrôle existe : le seed est GÉNÉRÉ par faker, et la forme des
 * valeurs change d'une version majeure de faker à l'autre sans rien casser à
 * la compilation. La montée 6 → 10 en est l'exemple : `phone.phoneNumberFormat(0)`
 * rendait `398-225-9900`, et le remplaçant naturel `phone.number()` rend
 * `691-531-1666 x9017` — une extension en plus, que le formulaire de réglages
 * refuse. Rien, dans le dépôt, ne l'aurait signalé : `yarn types` passe, les
 * tests unitaires passent, et le fichier de seed n'est régénéré qu'à la main.
 *
 * Ce que ce script PEUT vérifier : la forme des valeurs committées, au moment
 * où quelqu'un régénère le seed — c'est-à-dire au seul instant où elle change.
 * Ce qu'il NE PEUT PAS vérifier : que ces formes sont celles que l'application
 * veut. Ça, c'est le rôle des tests.
 */
const fs = require("fs");
const path = require("path");

// Un chemin peut être passé en argument : c'est ainsi qu'on contrôle un seed
// FRAÎCHEMENT généré avant de le committer, sans écrire dans `data/`.
// `GATE_ROOT` s'ajoute à l'argument positionnel : le premier sert à contrôler
// un seed fraîchement généré, le second à faire tourner cette gate contre un
// arbre de test (`check-gates.js`, ADR-012). L'argument reste prioritaire.
const RACINE = process.env.GATE_ROOT
  ? path.resolve(process.env.GATE_ROOT)
  : path.join(__dirname, "..");
const SEED = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(RACINE, "data", "database-seed.json");

const MOTIFS = {
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  telephone: /^\d{3}-\d{3}-\d{4}$/,
  chiffres10: /^\d{10}$/,
  chiffres9: /^\d{9}$/,
  email: /^[^@\s]+@[^@\s]+\.[^@\s]+$/,
  httpsUrl: /^https:\/\/\S+$/,
  dateISO: /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/,
  nonVide: /\S/,
};

// Le contrat, déclaré et non déduit : ce que l'application suppose du seed.
// Chaque collection exige au minimum ses dates et son uuid ; les champs dont
// la FORME compte sont nommés explicitement.
const DATES = { createdAt: "dateISO", modifiedAt: "dateISO" };
const CONTRAT = {
  users: {
    ...DATES,
    uuid: "uuid",
    email: "email",
    phoneNumber: "telephone",
    avatar: "httpsUrl",
    firstName: "nonVide",
    lastName: "nonVide",
    username: "nonVide",
  },
  contacts: { ...DATES, uuid: "uuid" },
  bankaccounts: {
    ...DATES,
    uuid: "uuid",
    accountNumber: "chiffres10",
    routingNumber: "chiffres9",
    bankName: "nonVide",
  },
  transactions: { ...DATES, uuid: "uuid", description: "nonVide" },
  likes: { ...DATES, uuid: "uuid" },
  comments: { ...DATES, uuid: "uuid", content: "nonVide" },
  notifications: { ...DATES, uuid: "uuid" },
  banktransfers: { ...DATES, uuid: "uuid" },
};

// Champs numériques dont l'application suppose qu'ils sont ENTIERS (des
// centimes). Un décimal ici produirait des montants à rallonge à l'affichage.
const ENTIERS = {
  users: ["balance"],
  transactions: ["amount", "balanceAtCompletion"],
  banktransfers: ["amount"],
};

/**
 * RÈGLES DÉCLARÉES, et non marquées par commentaire — ADR-012.
 *
 * Les autres gates portent un `// RÈGLE: <id>` à chaque site d'échec, parce
 * que leurs règles SONT des branches de code. Ici elles vivent dans une TABLE :
 * `CONTRAT` décrit 39 invariants qui passent tous par le même `ruptures.push`.
 * Un marqueur unique y aurait été un mensonge de granularité — prouver qu'un
 * `uuid` invalide est rejeté ne prouve RIEN sur les 38 autres, alors que le
 * compte de règles laissait croire le contraire.
 *
 * `check-gates.js` lit cette liste en priorité sur les marqueurs, et exige un
 * cas par entrée. Les identifiants sont DÉRIVÉS de `MOTIFS` : ajouter un motif
 * au contrat ajoute une règle à prouver, sans qu'on ait à y penser.
 */
const REGLES = [
  "seed-introuvable",
  "collection-absente",
  "champ-non-entier",
  ...Object.keys(MOTIFS).map((m) => `motif-${m}`),
];
// Exécution seulement en direct : `check-gates.js` requiert ce fichier pour
// lire `REGLES`, et ne doit pas déclencher le contrôle en le lisant.
//
// Une fonction et non un `return` en tête de module : Node l'accepterait (le
// module est enveloppé dans une fonction), mais ESLint analyse le fichier comme
// un script et refuse « 'return' outside of function ». Contourner l'outil
// aurait été le mauvais réflexe — la forme explicite se lit mieux de toute façon.
if (require.main !== module) module.exports = { REGLES };
else executer();

function executer() {
  if (!fs.existsSync(SEED)) {
    // RÈGLE: seed-introuvable
    console.error(`seed: ${path.relative(process.cwd(), SEED)} introuvable.`);
    process.exit(1);
  }
  const seed = JSON.parse(fs.readFileSync(SEED, "utf8"));
  const ruptures = [];
  let controles = 0;

  for (const [collection, champs] of Object.entries(CONTRAT)) {
    const lignes = seed[collection];
    if (!Array.isArray(lignes) || lignes.length === 0) {
      ruptures.push(`${collection} : collection absente ou vide`);
      continue;
    }
    for (const [champ, motif] of Object.entries(champs)) {
      const re = MOTIFS[motif];
      const fautifs = lignes.filter((l) => l[champ] !== undefined && !re.test(String(l[champ])));
      controles++;
      if (fautifs.length) {
        const exemple = JSON.stringify(fautifs[0][champ]);
        ruptures.push(
          `${collection}.${champ} : ${fautifs.length}/${lignes.length} ne respectent pas « ${motif} », dont ${exemple}`
        );
      }
    }
    for (const champ of ENTIERS[collection] || []) {
      const fautifs = lignes.filter(
        (l) => typeof l[champ] === "number" && !Number.isInteger(l[champ])
      );
      controles++;
      if (fautifs.length) {
        ruptures.push(
          `${collection}.${champ} : ${fautifs.length}/${lignes.length} ne sont pas entiers, dont ${fautifs[0][champ]}`
        );
      }
    }
  }

  if (ruptures.length === 0) {
    const total = Object.values(seed).reduce((n, v) => n + (Array.isArray(v) ? v.length : 0), 0);
    console.log(
      `seed: ${controles} invariants tenus sur ${Object.keys(CONTRAT).length} collections (${total} enregistrements).`
    );
    process.exit(0);
  }
  console.error(`\n${ruptures.length} rupture(s) du contrat de seed :`);
  ruptures.forEach((r) => console.error(`  ✖ ${r}`));
  console.error(
    `\nLe seed a probablement été régénéré avec une version de faker qui change la forme des valeurs.\nVérifier scripts/seedDataUtils.ts avant de committer data/database-seed.json.\n`
  );
  process.exit(1);
}
