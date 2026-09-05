# Revue des specs générées par IA — semaine 10

Six specs demandées à un LLM externe, relues comme on relit la PR d'un junior.
Le but n'est pas de savoir si l'IA « sait écrire des tests » : c'est de savoir
**où elle fait gagner du temps et où elle en coûte**, avec des chiffres.

## Protocole

Reproductible, et c'est le point : `yarn ia:mesure`.

- **Générateur** : un LLM externe, sans aucun contexte du dépôt — ni `CLAUDE.md`,
  ni `.claude/rules/`, ni les ADR, ni le hook. C'est le scénario réel : un
  développeur ouvre une fenêtre de chat et demande un test.
- **Prompt** : une phrase par spec, celle qu'on écrirait vraiment. Conservée en
  tête de chaque fichier.
- **Sortie brute** : `docs/ia/brut/*.cy.ts.txt`, telle que reçue, jamais
  retouchée. L'extension `.txt` la garde hors d'eslint, de prettier, de tsc et
  du `specPattern` — aucune exclusion à maintenir.
- **Arbitre** : `.claude/hooks/check-spec.sh`, le hook qui bloque mes propres
  specs depuis la semaine 1. Il ignore qui a écrit ce qu'il lit, et c'est ce qui
  rend son verdict utilisable.

## 1. Le verdict automatique

| Spec                        | Violations | Ce que la gate a nommé                                                |
| --------------------------- | ---------: | --------------------------------------------------------------------- |
| 1 — notifications, like     |          6 | login UI, `cy.wait(ms)`, `#id`, `data-test` en dur, seed, tags        |
| 2 — notifications, compteur |          7 | mot de passe en dur, `cy.wait(ms)`, `#id`, `it.only`, seed, tags      |
| 3 — comptes, création       |          5 | mot de passe en dur, `#id`, `data-test` en dur, seed, tags            |
| 4 — comptes, suppression    |          5 | mot de passe en dur, `cy.wait(ms)`, `data-test` en dur, seed, tags    |
| 5 — settings, mise à jour   |          5 | mot de passe en dur, `cy.wait(ms)`, `data-test` en dur, seed, tags    |
| 6 — settings, validation    |          6 | mot de passe en dur, `#id`, `data-test` en dur, `it.skip`, seed, tags |

**6 specs sur 6 bloquées. 34 violations.** Aucune n'aurait pu être commitée.

Ce chiffre est un **plancher** : il ne compte que ce qu'une règle sait nommer.

### Ce que cette mesure a trouvé chez moi, pas chez l'IA

La première exécution a affiché autre chose que des violations :

```
.claude/hooks/check-spec.sh: line 37: code: unbound variable
```

Le hook lisait `$code` aux lignes 37 et 40 alors que la variable n'était
affectée qu'à la ligne 62. Sous `set -u`, la substitution échoue, le `grep`
d'une condition `if` rend faux — et **deux règles ne se déclenchaient jamais** :
« aucun accès direct à lowdb » et « aucun mot de passe en dur », les deux
interdits les plus durs du projet.

Une spec générée contenait `s3cret` en clair. Le hook l'a laissée passer.

C'est la troisième garde de ce dépôt qui échoue **ouvert**, après `jq` absent
en semaine 6 et le serveur OIDC fantôme en semaine 9. Le motif ne change pas :
_ce qui ne bloque jamais ne se distingue pas de ce qui n'a rien à bloquer._
`check-hook.js` est passé de 15 à 28 cas et couvre désormais chaque règle
d'interdiction — la colonne « mot de passe en dur » du tableau ci-dessus
n'existe que grâce à cette réparation.

**Le sous-produit le plus utile de l'exercice n'est donc pas une spec. C'est
un défaut de mon outillage, révélé par du code que je n'avais pas écrit.**

## 2. Ce que les gates ne voient pas

C'est ici que se joue la revue, et c'est ici que l'IA coûte du temps.

### Spec 1 — le test ne teste pas son titre

Le titre annonce `should display a notification when someone likes your
transaction`. Le test ne crée **aucun like**. Il se connecte, ouvre les
notifications, et vérifie qu'il y en a.

Or le seed par défaut donne déjà **8 notifications à Heath93** (vérifié dans
`data/database-seed.json`). Le test passe donc toujours — et il passerait à
l'identique **si la fonctionnalité de like était entièrement supprimée**.

C'est le défaut le plus grave des six, et aucune gate ne peut le voir : le code
est syntaxiquement irréprochable. Il faut connaître le seed pour savoir que
l'assertion est déjà vraie avant que le test ne commence.

> Une assertion qui est vraie avant l'action ne prouve rien de l'action.

### Spec 2 — une assertion qui passe dans les deux sens

```js
.should('not.equal', before);
```

Le compteur doit **diminuer**. `not.equal` passe aussi s'il augmente, ce qui
serait précisément le bug. La direction n'est pas asserted.

S'y ajoute `before()` au lieu de `beforeEach()` : les tests suivants
hériteraient de l'état du premier. Ici la gate attrape la conséquence (pas de
`cy.seed` dans un `beforeEach`) sans nommer la cause.

### Spec 3 — un test circulaire

Le `cy.intercept` stubbe la réponse GraphQL, puis le test vérifie que la liste
affiche `Test Bank` — c'est-à-dire **exactement ce que le stub vient de
renvoyer**. Le test passerait serveur éteint.

Un stub sert à provoquer ce qu'on ne sait pas provoquer autrement : une erreur
500, une latence, une réponse malformée. L'utiliser sur le chemin nominal
revient à tester le stub.

Détail à porter au crédit du modèle : il a visé `POST /graphql` — **et c'est
juste**, les comptes bancaires de cette application passent bien par GraphQL
quand tout le reste est REST. Il ne l'a pas deviné : cette application est un
dépôt public très connu, donc présent dans ses données d'entraînement.

**C'est un piège, pas un atout.** Sur une application privée, la même assurance
aurait produit la même syntaxe et une route inventée. Rien dans la sortie ne
distingue « je connais cette application » de « je devine ». Le ton est
identique dans les deux cas.

### Spec 4 — une hypothèse sur le backend, jamais vérifiée

```js
.should('have.length', n - 1);
```

Le test suppose une suppression **physique**. Le backend fait un _soft delete_
(`removeBankAccountById` → `.assign({ isDeleted: true })`). Que la liste se
réduise quand même dépend du filtrage côté front — le test ne le sait pas, il
le parie.

Et Heath93 n'a qu'**un seul** compte dans le seed : `n - 1` vaut 0. Si la liste
vide rend un état vide au lieu d'une liste vide — ce que fait déjà
`NotificationList` dans cette même application — le `find('li')` s'applique à un
élément absent. Le test est suspendu à un détail de rendu que personne n'a lu.

### Spec 5 — la seule assertion honnête du lot

```js
cy.reload();
cy.get("[data-test=user-settings-firstName-input]").should("have.value", "Nouveau");
```

Le rechargement force un aller-retour serveur : la valeur relue vient bien de
la persistance. **C'est la bonne idée du lot**, et elle mérite d'être dite.

Elle est précédée d'un `should('exist')` sur le formulaire — vrai avant comme
après l'envoi, donc décoratif — et d'un `cy.wait(1000)` qui masque exactement la
condition de course que le `reload` traite proprement.

### Spec 6 — un test qui ne devrait pas exister

La validation du formulaire est **déjà couverte**, en test de composant :
`src/components/UserSettingsForm.cy.tsx` contient « refuse une adresse e-mail
mal formée et désactive l'envoi » et « refuse un champ obligatoire vidé ».

La grille ADR-004 refuse donc cet E2E : le comportement se prouve sans réseau,
sans serveur et sans session. Le rejouer en E2E échange quelques millisecondes
contre plusieurs secondes, pour la même information.

Le second `it` porte `.skip` — l'IA a livré un test désactivé sans le signaler.

Et l'assertion `cy.get('.Mui-error')` porte sur une **classe interne de la
bibliothèque de composants** : elle casse à la prochaine montée de MUI sans
qu'aucun comportement de l'application n'ait changé. La semaine 7 a déjà payé
cette leçon sur une régression Dependabot.

`check-levels.js` ne pouvait rien dire : cette gate vérifie que le niveau est
**écrit**, pas qu'il est **juste** — sa propre documentation le reconnaît. La
frontière entre décidable et indécidable est exactement là.

## 3. Le compte

|         | Détectable par une gate | Visible seulement en revue |
| ------- | ----------------------: | -------------------------: |
| Défauts |                  **34** |                     **11** |

Les 11 : le test qui ne teste pas son titre (1), l'assertion bidirectionnelle
(2), le test circulaire (3), l'hypothèse de suppression physique et le pari sur
la liste vide (4), l'assertion décorative (5), le niveau erroné, le test
désactivé et l'assertion sur une classe MUI (6) — plus, transversalement, deux
`describe` dont le nom promet plus que le corps.

**Un défaut sur quatre échappe à l'outillage.** Et ce sont les plus coûteux :
une violation de règle se corrige en dix secondes, un test qui passe sans rien
prouver survit des mois.

## 4. Quand l'IA fait gagner du temps, quand elle en coûte

**Elle en fait gagner** sur la structure : les six fichiers étaient
syntaxiquement corrects du premier coup, les sélecteurs `data-test` largement
exacts, le transport GraphQL bien identifié. Écrire ces squelettes à la main
aurait pris plus longtemps que les corriger.

**Elle en coûte** sur ce qui fait la valeur d'un test : _ce qu'il prouve_. Les
six specs ignorent le seed, le contrat du backend, la couverture existante et
la grille de niveau — parce qu'aucune de ces choses n'est dans le code qu'on
lui montre. Elle produit un test **plausible**, pas un test **vrai**.

> L'IA écrit ce à quoi un test ressemble. Ce qu'un test prouve reste à écrire.

Le rapport de forces est donc net et il tient en une phrase : **elle accélère la
frappe, elle n'accélère pas le jugement** — et dans une suite de tests, la
frappe n'a jamais été le coût.

Corollaire pratique, et c'est celui qui a été appliqué à la démonstration
`cy.prompt` (ADR-011) : **on ne délègue à l'IA que ce qu'on ne sait pas encore
écrire, jamais ce qu'on a déjà écrit.** Le seed, la session et la navigation
restent en L2, typés et déterministes.

## 5. La règle qui en sort

Toute spec issue d'une génération porte le tag `@ai-generated` et doit figurer
dans ce fichier. `scripts/check-ai-review.js` refuse un tag sans revue écrite —
`ARCHITECTURE.md` §10 annonçait ce gate ; il existe désormais.

Le tag ne marque pas une suspicion permanente. Il marque le fait qu'une
personne a relu ce que la machine a proposé, et signé.

## 6. Fichiers couverts par cette revue

`check-ai-review.js` exige que le chemin de toute spec taguée `@ai-generated`
figure littéralement ci-dessous. Un tag sans ligne ici fait échouer `yarn lint`.

- `cypress/manual/prompt-demo.cy.ts` — démonstration `cy.prompt` (ADR-011).
  Hors `specPattern` : elle n'entre pas dans la suite, et ce qu'elle produit
  passe par cette même revue avant tout usage.

### Retenues et corrigées — 4 sur 6

- `cypress/e2e/notifications/lecture.cy.ts` — issue de la spec 2. `not.equal`
  remplacé par une égalité exacte et décroissante.
- `cypress/e2e/bank-accounts/creation.cy.ts` — issue de la spec 3. Le stub
  GraphQL est retiré : le test traverse le vrai serveur.
- `cypress/e2e/bank-accounts/suppression.cy.ts` — issue de la spec 4.
  L'assertion porte sur l'identité du compte supprimé, pas sur une longueur, et
  le _soft delete_ est nommé.
- `cypress/e2e/user-settings/mise-a-jour.cy.ts` — issue de la spec 5, dont la
  bonne idée (le rechargement) est devenue le motif des quatre.

### Écartées — 2 sur 6

- **Spec 1 (like → notification)** : écartée parce que **le comportement
  n'existe pas**. `POST /notifications/bulk` existe côté serveur mais n'est
  appelé nulle part dans le front — vérifié. Un like ne produit aucune
  notification dans cette application. La spec générée testait donc une
  fonctionnalité imaginaire, et passait quand même, portée par les 8
  notifications du seed. C'est l'illustration la plus nette de tout l'exercice :
  **un test peut être vert, syntaxiquement parfait, et porter sur du vide.**
- **Spec 6 (validation)** : écartée par la grille ADR-004 — déjà couverte par
  cinq tests de composant dans `src/components/UserSettingsForm.cy.tsx`.

Deux specs sur six ne devaient donc pas exister. Aucune gate ne pouvait le dire :
la première demandait de lire le front, la seconde de connaître la couverture.
