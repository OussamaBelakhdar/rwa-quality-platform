# ADR-011 — Cypress Cloud pour `cy.prompt` : une démonstration manuelle, jamais une dépendance

**Statut** : proposé — **une vérification empirique conditionne l'acceptation, voir « Avant d'accepter »**
**Date** : 2026-09-05
**Semaine du plan** : 10

## Contexte

Trois textes du dépôt se contredisent, et la semaine 10 est le moment où la contradiction devient bloquante.

| Texte                      | Ce qu'il dit                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------ |
| `docs/PLAN.md`, semaine 10 | « générer 3 specs avec `cy.prompt` (Cypress 15.4+, **nécessite Cloud**) »            |
| `CLAUDE.md`                | « Pas de dépendance à Cypress Cloud dans le code ou la CI. »                         |
| `docs/ARCHITECTURE.md`, P6 | « Reproductible par un inconnu en 3 commandes — **sans compte Cloud**, sans secret » |

Le livrable exige l'outil ; la règle interdit sa condition d'usage. Aucune rédaction habile ne fait disparaître ça : il faut trancher, et écrire pourquoi.

### Ce que `cy.prompt` exige réellement

Vérifié le 2026-09-05 sur <https://docs.cypress.io/api/commands/prompt> et <https://docs.cypress.io/cloud/faq> (section `cy.prompt`), contre la version réellement installée ici (`cypress@15.21.1`). Les chiffres sont sourcés parce que le reste du dépôt s'impose que chaque chiffre soit recomptable par un inconnu ; un chiffre externe non traçable aurait rompu la règle.

| Fait                                                                                                                 | Conséquence ici                                                      |
| -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| **Compte Cypress Cloud obligatoire** — prompt et contexte de page transitent par le Cloud, qui appelle le LLM        | C'est exactement la dépendance que P6 refuse                         |
| **Le plan gratuit suffit** : 100 prompts/h et 500 étapes/h par utilisateur, pour les runs **qui n'enregistrent pas** | Pas de coût, pas de `--record`, pas de clé d'enregistrement          |
| **E2E seulement**, **Chromium seulement**                                                                            | Exclut nos 27 tests de composant et le job Firefox                   |
| Cypress s'engage à ne pas entraîner ses modèles sur les prompts ; entrées et sorties sont liées à la session         | Réduit le risque de fuite sans l'annuler : le DOM part chez un tiers |

**La parenthèse du plan est périmée et cet ADR la corrige.** `cy.prompt` n'est plus « expérimental depuis 15.4 » : il est passé en **bêta en 15.13.0**, et le drapeau `experimentalPromptCommand` a été **supprimé**. Sur `15.21.1` la commande est typée et disponible sans aucun réglage (`node_modules/cypress/types/cypress.d.ts`, `prompt<T>(steps: string[], options?: PromptOptions)`). La seule barrière restante est donc le compte, pas la configuration.

### Le précédent de la semaine 7 va CONTRE cette demande, pas pour

Il faut le dire dans ce sens, parce que l'inverse serait confortable et faux.

`docs/ARCHITECTURE.md` affirme aujourd'hui : « Test Replay utilisé une fois en démonstration ». **C'est faux, et cet ADR corrige la ligne.** Le plan de la semaine 7 montre l'item _barré_, avec sa justification en clair dans `docs/metrics.md` : la valeur de Test Replay — le post-mortem d'un échec CI — était **remplaçable sans compte**, et elle a été remplacée par les artefacts sur échec, le rapport HTML agrégé, les annotations `::error::` et `cy:burn`.

La règle qui en découle est plus stricte que « pas de Cloud en CI » :

> Une fonctionnalité Cloud dont la **valeur** est remplaçable sans compte doit être remplacée, pas démontrée.

Il faut donc justifier `cy.prompt` sur ce critère-là, et pas sur un précédent complaisant.

### Pourquoi `cy.prompt` passe ce critère là où Test Replay échouait

Le code généré par `cy.prompt` est parfaitement remplaçable : un LLM externe en produit autant, gratuitement, sans compte — c'est l'objet du volet « 6 specs LLM externe », et c'est pourquoi la démonstration ne sert **pas** à écrire des tests.

Ce qui n'est pas remplaçable est ailleurs, et c'est un argument d'architecture, pas de vitrine : **cet ADR fait édicter au projet une règle contre `cy.prompt`.** La gate `check-cloud.js` interdit désormais la commande dans toute la suite. Or ce dépôt passe son temps à corriger des décisions prises sans mesure — ADR-009 a vu sa décision s'inverser sur un chiffre, ADR-001 a dû être révisé après le premier run. **Interdire un outil qu'on n'a jamais exécuté serait exactement la faute que ces révisions ont coûté cher à réparer.** La démonstration n'existe pas pour valoriser `cy.prompt` ; elle existe pour que l'interdiction qui l'encadre soit fondée.

### L'argument que je n'utilise pas comme argument technique

Un argument supplémentaire existe, et l'honnêteté commande de l'isoler plutôt que de le fondre dans les précédents : **en entretien, « je ne l'ai pas essayé » est une réponse faible.** C'est un argument de valeur portfolio. Il est réel — ce dépôt a un but déclaré — mais ce n'est pas de l'ingénierie, et il ne doit pas emprunter le vocabulaire de la rigueur.

Pesé seul, il ne suffirait pas : une démonstration bâclée, suivie d'une revue complaisante, coûterait plus cher qu'une absence assumée. Il ne fait donc pas pencher la décision ; il ne fait que la rendre moins regrettable si la mesure ne donne rien d'intéressant.

## Options considérées

| Option                                                                     | Avantages                                                                                                         | Inconvénients                                                                                                                                                                           | Coût                            |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| **A — Renoncer à `cy.prompt`**, ne garder que les 6 specs LLM externe      | P6 intact, zéro compte, zéro question                                                                             | Le projet interdirait alors dans une gate un outil qu'il n'a jamais exécuté — la faute que ce dépôt a déjà payée deux fois                                                              | 0                               |
| **B — Une démonstration manuelle, hors de tout `specPattern`** _(retenue)_ | Les deux contraintes tenues ; l'interdiction devient fondée ; le précédent `Cypress.stop()` donne la forme exacte | Un compte gratuit à créer, une fois ; le DOM de l'app de démonstration (données de seed) part chez un tiers                                                                             | ~40 lignes + 1 gate             |
| **C — `cy.prompt` dans la CI**                                             | Le livrable au pied de la lettre                                                                                  | Viole P6 frontalement, ajoute un secret, et met une **boîte noire non déterministe dans un gate bloquant**                                                                              | 1 secret + fragilité permanente |
| **D — Un équivalent auto-hébergé**                                         | Aurait tout résolu                                                                                                | **N'existe pas.** L'appel au LLM est fait _par le Cloud_, pas par le runner : aucun point d'extension. Currents et Sorry-Cypress réimplémentent l'orchestration, pas `cy.prompt`        | —                               |
| **E — Faire exécuter `cy.prompt` par un tiers déjà titulaire d'un compte** | P6 intact au sens strict : aucun compte créé de mon fait                                                          | La sortie devient invérifiable — ni le prompt exact, ni la version, ni l'app ne sont maîtrisés. Une pièce rapportée n'est pas une mesure, et c'est précisément ce qu'on reproche à l'IA | 0                               |

L'option qu'un recruteur proposerait spontanément est **C** — « mets-le dans la CI, c'est ça l'IA en 2026 ». Elle perd ici pour une raison qui n'a rien à voir avec le prix : **un gate doit être déterministe**. Le jour où le modèle change de version, la suite change de comportement sans qu'une ligne du dépôt n'ait bougé. C'est l'inverse d'un test de non-régression.

## Décision

**Option B**, encadrée par quatre bornes — et une gate, parce qu'une borne écrite dans un markdown n'est pas une borne.

1. La démonstration vit dans **`cypress/manual/`**, hors du `specPattern` E2E comme du `specPattern` composant. Elle n'est jouée que par sa commande dédiée, jamais par `yarn cy:run`, jamais en CI.
2. **Rien qui rattache le dépôt à un compte n'est commité** : ni `projectId` dans `cypress.config.ts`, ni `CYPRESS_RECORD_KEY` dans `.github/`. L'authentification passe par la session `cypress open` de l'opérateur, sur son poste.
   **Formulation volontairement défensive** : la première rédaction affirmait « `cy.prompt` n'exige aucun `projectId` ». C'était une hypothèse non testée, et l'assistant de connexion de Cypress Cloud écrit historiquement un `projectId` dans la configuration au moment où l'on lie un projet. La borne ne porte donc pas sur ce que l'outil demande — que je ne contrôle pas — mais sur **ce qui entre dans un commit**, que je contrôle. `check-cloud.js` §2 la fait respecter quoi qu'il arrive.
3. Le code produit par `cy.prompt` **n'est pas fusionné tel quel**. Il entre dans la même revue que les specs générées par LLM externe (`docs/ia-revue.md`) et porte le tag `@ai-generated`.
4. La vidéo va dans **`artefacts/`** — ignoré par git, comme la semaine 9. La règle « jamais de commit de vidéos » ne souffre pas d'exception pour une démonstration.

**Gate `check-cloud.js`** — ADR-003 avait écrit cet invariant sous forme d'une commande `grep` dans sa section « surveillé via ». Personne ne l'a jamais lancée : elle vivait dans un fichier de documentation, et pendant ce temps `ARCHITECTURE.md` a dérivé sans que rien ne l'arrête. Elle devient la **9ᵉ** gate de `yarn lint` — j'avais d'abord écrit « 10ᵉ », le chaînage en comptait huit — et elle échoue si `record: true`, `--record`, `CYPRESS_RECORD_KEY` ou un `projectId` réapparaissent, si une spec de la suite appelle `cy.prompt`, ou si un `specPattern` venait englober `cypress/manual/`.

**Correction de `docs/ARCHITECTURE.md`** : la ligne « Test Replay utilisé une fois en démonstration » est remplacée par ce qui s'est réellement passé.

## Avant d'accepter

Cet ADR reste **proposé** tant que la borne 2 n'est pas vérifiée sur pièce. C'est la seule affirmation technique dont la fausseté changerait la décision, et elle ne peut pas l'être par la lecture.

- [ ] Exécuter `yarn cy:demo:prompt` une fois, puis relever ce que la connexion à Cloud a modifié dans l'arbre de travail (`git status`).
- [ ] Si un `projectId` a été écrit dans `cypress.config.ts` : le retirer avant tout commit, et le consigner ici comme comportement attendu de l'outil.
- [ ] `node scripts/check-cloud.js` doit être vert **après** la démonstration, pas seulement avant.

## Conséquences

- **Positives** : le livrable de la semaine 10 est tenu sans entamer P6 ; un invariant qui n'était qu'une phrase dans un ADR devient exécutable ; l'interdiction faite à `cy.prompt` s'appuie sur une exécution.
- **Négatives assumées** :
  - La démonstration n'est **pas reproductible par un inconnu** — il lui faut son propre compte gratuit. C'est une exception explicite à P6, bornée à un fichier hors `specPattern`.
  - Le DOM de l'application de démonstration transite par un tiers. Ce sont des données de seed, aucune donnée réelle.
  - **La vidéo étant dans `artefacts/`, un lecteur du dépôt ne la verra jamais.** La trace durable n'est donc pas le film mais l'écrit : le code brut généré, conservé sous `docs/ia/brut/`, et sa revue dans `docs/ia-revue.md`. Si ces deux-là manquaient, la démonstration ne prouverait rien à personne d'autre qu'à moi — et l'option A redeviendrait la bonne.
- **Surveillé via** : `node scripts/check-cloud.js`, chaîné dans `yarn lint`.

## Réversibilité

Supprimer `cypress/manual/prompt-demo.cy.ts` et son script `yarn`. **Aucune couche L0-L5 n'est touchée** : rien dans la suite, les commandes, les gates ou la CI ne dépend de ce fichier — c'est ce que la borne 1 garantit.

Le retour arrière n'est cependant pas à coût nul, contrairement à ce qu'affirmait la première rédaction : `check-cloud.js` cite ADR-011 dans ses commentaires et ses messages d'erreur. Il faudrait les reformuler pour qu'ils citent P6 et ADR-003 seuls — la gate, elle, resterait, et deviendrait **plus** stricte, pas moins.
