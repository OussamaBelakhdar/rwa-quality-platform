# ADR-012 — Les gates sont prouvées par mutation, ou elles ne comptent pas

**Statut** : proposé
**Date** : 2026-09-05
**Semaine du plan** : 10

## Contexte

Six garde-fous de ce dépôt ont cessé de garder quoi que ce soit, sans qu'aucun ne le signale.

| Semaine | Garde-fou                 | Comment il échouait                                                                               |
| ------- | ------------------------- | ------------------------------------------------------------------------------------------------- |
| 6       | `check-spec.sh`           | `jq` absent de l'image CI → substitution vide, sortie 0                                           |
| 9       | serveur OIDC de test      | `kill` visait le wrapper `npx`, pas le processus qui tenait le port → 3 mutations vertes          |
| 10      | `check-spec.sh`, 2 règles | `$code` lu avant affectation ; sous `set -u`, lowdb et mot de passe en dur ne fired plus          |
| 10      | `check-hook.js`           | couvrait 6 règles sur 14 — la panne ci-dessus était donc invisible                                |
| 10      | `check-selectors.js`      | motif aveugle à `data-test={"clé"}` → 5 clés hors union, aucune alerte                            |
| 10      | `auth0_configured`        | répondait « ai-je des identifiants ? » quand la spec demandait « l'app est-elle en mode Auth0 ? » |

Cinq sur six **échouaient ouvert** : ils laissaient passer ce qu'ils existaient pour bloquer. Aucun n'a été trouvé par la CI — elle était verte à chaque fois, par construction.

### Le vrai défaut n'est aucun de ces six

Chacun a été corrigé, puis **prouvé par mutation** : on réintroduit le défaut, on vérifie que la gate échoue, on restaure. Cette preuve est le seul geste qui distingue une gate qui garde d'une gate qui décore.

Et **il n'en restait rien**. Ces preuves vivaient dans un terminal. Elles ne tournaient plus jamais. Une gate écrite en semaine 6 n'a aucune raison de fonctionner en semaine 10 — le hook l'a démontré en cessant de bloquer sans qu'une seule ligne de son propre fichier ne change : c'est l'ordre des instructions autour de lui qui avait bougé.

> Une gate non rejouée est une hypothèse sur le passé.

## Options considérées

| Option                                                                                  | Avantages                                                                                             | Inconvénients                                                                                                                                                                                     | Coût                            |
| --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| **A — Continuer à prouver à la main**                                                   | Zéro code                                                                                             | C'est exactement ce qui a produit les six pannes. La discipline humaine a déjà échoué six fois ici ; l'invoquer une septième serait ignorer la mesure                                             | 0                               |
| **B — Un banc par gate**, sur le modèle de `check-hook.js`                              | Simple, aucun mécanisme partagé                                                                       | `check-hook.js` EST ce modèle, et il couvrait 6 règles sur 14. Rien n'aurait dit qu'il manquait les huit autres — le défaut de couverture reste invisible                                         | ~10 fichiers                    |
| **C — Une méta-gate qui découvre les règles et exige une preuve par règle** _(retenue)_ | Le retard de couverture devient une ERREUR, pas un silence. Les preuves rejouent à chaque `yarn lint` | Chaque règle doit porter un marqueur ; chaque gate doit accepter une racine surchargeable                                                                                                         | ~200 lignes + 8 lignes par gate |
| **D — Mutation testing générique (Stryker)**                                            | Outil éprouvé, aucune convention maison                                                               | Mesure la couverture de tests d'un code applicatif, pas la capacité d'un script de gate à rejeter un ARBRE DE FICHIERS. Les gates n'ont pas de tests à muter — c'est leur ENTRÉE qu'il faut muter | dépendance + inadapté           |

L'option qu'un lecteur proposerait spontanément est **D**. Elle perd parce qu'elle répond à une autre question : Stryker mute du code pour vérifier que des tests le détectent ; ici il faut muter une **entrée** pour vérifier qu'un script la rejette. Le sujet n'est pas le même.

## Décision

**Option C.** `scripts/check-gates.js`, 11ᵉ gate de `yarn lint`, avec quatre contrôles :

1. **Aucune gate hors contrat.** Tout `scripts/check-*.js` est soit sous contrat, soit exempté **avec sa raison écrite**. On n'ajoute pas une gate en douce.
2. **Les règles sont DÉCLARÉES quand elles vivent dans une table.** Une gate peut exporter `REGLES` : `check-seed-contract` fait passer 39 invariants par un seul `ruptures.push`, et un marqueur unique y annonçait « 1 règle prouvée » là où 38 ne l'étaient pas. Ses identifiants sont dérivés de sa table de motifs — ajouter un motif ajoute une règle à prouver, sans qu'on ait à y penser. **Le compte de règles cesse d'être un compte de sites d'échec.**
3. **Aucune règle sans preuve.** Chaque site d'échec porte un marqueur `// RÈGLE: <id>` ; une règle sans cas de rejet fait échouer le lint. **C'est le contrôle qui manquait** : il aurait nommé les huit règles non couvertes de `check-hook.js` — 6 sur 14 l'étaient.
4. **Aucun cas orphelin.** Un cas qui vise une règle disparue donne une assurance fausse ; il est refusé.
5. **Chaque cas est rejoué.** La gate tourne contre un arbre de test (`GATE_ROOT`) et doit rejeter ce qui doit l'être — et **accepter** les contrôles négatifs, parce qu'une gate qui rejette tout apprend à être contournée.
6. **Un plantage n'est pas un rejet.** Une gate cassée sort en non-zéro exactement comme une gate qui refuse : sans ce contrôle, elle passerait tous ses propres cas. La trace Node les sépare — après avoir retiré les couleurs, car le premier motif, ancré sur `^\s+at `, ne voyait jamais les lignes qu'ANSI enrobe. **Un contrôle qui existait et ne contrôlait rien : la septième occurrence du défaut, dans le code écrit pour l'empêcher.**

Les preuves faites à la main entrent dans `scripts/gates.cas.js` et cessent d'être des souvenirs.

## Conséquences

- **Positives** : la panne de `check-selectors` est rejouée à chaque lint — vérifié en la réintroduisant. Le retard de couverture est chiffré et visible. Ajouter une règle sans la prouver devient impossible.
- **Négatives assumées** :
  - **Huit gates sur treize sont sous contrat** — 32 règles, 43 cas rejoués à chaque `yarn lint`. Aucune exemption n'est plus un report : les cinq restantes sont structurelles, et leur raison est écrite dans le fichier.
  - `check-secrets` interroge l'historique git, `check-executed` lit des rapports de run, `check-test-surface` construit l'application et interroge des ports. Ces trois-là observent autre chose qu'un arbre de fichiers ; `GATE_ROOT` ne les représente pas. `check-test-surface` portait « semaine 11 » jusqu'à ce que la tentative de la mettre sous contrat démente ce report — l'exemption est désormais motivée, pas différée.
  - `check-hook` et `check-gates` se prouvent eux-mêmes : le premier découvre les 14 règles du hook dans sa source et échoue si l'une n'a aucun cas ; le second est cette gate.
  - Les marqueurs `// RÈGLE:` sont une convention maison. Elle est visible dans la source de chaque gate, ce qui vaut mieux qu'un registre séparé qui dériverait.
- **Surveillé via** : `node scripts/check-gates.js`, chaîné dans `yarn lint`.

## Réversibilité

Retirer la gate du chaînage et supprimer deux fichiers. Les marqueurs `// RÈGLE:` sont des commentaires : ils ne coûtent rien s'ils survivent. La surcharge `GATE_ROOT` reste utile isolément — elle rend chaque gate exécutable hors du dépôt, ce qui est la condition pour la tester du tout.

**Aucune couche L0-L5 n'est touchée** : `check-gates.js` ne lit ni les specs, ni l'application. Il ne lit que d'autres scripts.
