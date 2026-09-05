#!/usr/bin/env node
/**
 * Vérifie que `cypress/support/selectors/data-test.ts` correspond exactement
 * aux attributs `data-test` statiques présents dans `src/`.
 *
 * Sans ce contrôle, la « source unique de vérité » n'est vraie que le jour où
 * on l'écrit : supprimer un data-test de src/ laisserait une clé fantôme dans
 * l'union, et en ajouter un laisserait les specs sans typage. La convention
 * devient une gate au lieu d'une intention (.claude/rules/testing.md #9).
 *
 * Couvre aussi `DataTestPrefix` (support/types.ts) : chaque préfixe déclaré
 * doit correspondre à au moins un `data-test` dynamique de `src/`. Sans quoi
 * `cy.getBySelLike` accepterait à la compilation un préfixe qui ne sélectionne
 * rien — le typage donnerait une garantie qu'il n'a pas.
 */
const fs = require("fs");
const path = require("path");

const RACINE = path.join(__dirname, "..");
const SRC = path.join(RACINE, "src");
const UNION = path.join(RACINE, "cypress", "support", "selectors", "data-test.ts");

function fichiersSource(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return fichiersSource(full);
    return /\.(ts|tsx)$/.test(e.name) && !/\.cy\.tsx?$/.test(e.name) ? [full] : [];
  });
}

const dansSrc = new Set();
for (const f of fichiersSource(SRC)) {
  const contenu = fs.readFileSync(f, "utf8");
  // Deux écritures produisent une clé STATIQUE, et le motif doit accepter les deux :
  //   data-test="cle"                       — JSX ordinaire
  //   inputProps={{ "data-test": "cle" }}   — la façon MUI de viser l'<input> interne
  // Le motif ne couvrait que la première. Les cinq clés posées via `inputProps`
  // étaient donc invisibles du contrôle : absentes de `dansSrc` ET de l'union,
  // elles ne déclenchaient ni « manquante » ni « fantôme ». Un garde-fou muet sur
  // une écriture pourtant présente dans le dépôt ne garantit rien — le commentaire
  // du motif de préfixes revendiquait déjà les trois écritures, mais seule cette
  // extraction-ci était restée en arrière.
  // Les formes dynamiques (backtick) restent exclues ici : elles relèvent du
  // contrôle de préfixes plus bas.
  // `\{?` : la forme JSX `data-test={"cle"}` était INVISIBLE au motif, qui
  // exigeait un guillemet immédiatement après le `=`. Trois clés de
  // `BankAccountForm.tsx` vivaient donc dans src/ sans être dans l'union, et
  // la gate ne signalait rien — elle ne peut pas réclamer une clé qu'elle ne
  // voit pas. Quatrième garde de ce projet à échouer OUVERT.
  for (const m of contenu.matchAll(/data-test["']?\s*[:=]\s*\{?\s*["']([^"'${}`]+)["']/g))
    dansSrc.add(m[1]);
}

const union = fs.readFileSync(UNION, "utf8");
const dansUnion = new Set([...union.matchAll(/^\s+"([^"]+)",$/gm)].map((m) => m[1]));

const manquantes = [...dansSrc].filter((k) => !dansUnion.has(k)).sort();
const fantomes = [...dansUnion].filter((k) => !dansSrc.has(k)).sort();

// Préfixes dynamiques : `data-test={`transaction-item-${id}`}`
const TYPES = path.join(RACINE, "cypress", "support", "types.ts");
const blocPrefix = /DataTestPrefix\s*=\s*([^;]+);/.exec(fs.readFileSync(TYPES, "utf8"));
const prefixes = blocPrefix ? [...blocPrefix[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]) : [];
const sourceBrute = fichiersSource(SRC)
  .map((f) => fs.readFileSync(f, "utf8"))
  .join("\n");
// Le motif accepte les TROIS écritures d'un `data-test` dans ce dépôt :
//   data-test="cle-statique"
//   data-test={`prefixe-${id}`}
//   inputProps={{ "data-test": `prefixe-${id}` }}
// La troisième est la façon MUI de poser l'attribut sur l'<input> interne.
// Elle était absente du motif, et un préfixe pourtant PRÉSENT dans src/ était
// signalé orphelin — un garde-fou qui refuse du code correct apprend à être
// contourné, exactement comme celui qui laisse passer du code fautif.
const motifPrefixe = (p) =>
  new RegExp(
    `data-test["']?\\s*[:=]\\s*[{]?\\s*[\`"']?${p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`
  );
const prefixesOrphelins = prefixes.filter((p) => !motifPrefixe(p).test(sourceBrute));

if (manquantes.length === 0 && fantomes.length === 0 && prefixesOrphelins.length === 0) {
  console.log(
    `selectors: ${dansUnion.size} clés et ${prefixes.length} préfixes, src/ et les types concordent.`
  );
  process.exit(0);
}

if (manquantes.length) {
  console.error(`\n${manquantes.length} clé(s) présentes dans src/ mais absentes de l'union :`);
  manquantes.forEach((k) => console.error(`  + ${k}`));
}
if (fantomes.length) {
  console.error(`\n${fantomes.length} clé(s) dans l'union mais disparues de src/ :`);
  fantomes.forEach((k) => console.error(`  - ${k}`));
}
if (prefixesOrphelins.length) {
  console.error(
    `\n${prefixesOrphelins.length} préfixe(s) DataTestPrefix sans correspondance dans src/ :`
  );
  prefixesOrphelins.forEach((p) => console.error(`  ? ${p}`));
}
console.error(`\nMettre à jour ${path.relative(RACINE, UNION)} (.claude/rules/testing.md #9).\n`);
process.exit(1);
