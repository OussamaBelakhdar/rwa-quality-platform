# Semaine 3 — brouillon LinkedIn

Mon ADR affirmait que Vite éliminerait le code mort au build, et qu'un `grep` du bundle suffirait à garantir qu'aucune surface de test ne parte en production.

J'ai implémenté, puis mesuré. Les deux affirmations étaient fausses.

Le `grep` trouve `__services__` dans le bundle par défaut. La comparaison `VITE_TEST_HOOKS === "true"` y survit aussi, non repliée par le minifieur. Le module est importé, donc bundlé — `define` remplace une expression, il ne supprime pas un fichier.

Ce qui est vrai, en revanche : à l'exécution, `window.__services__` vaut `undefined`. La garde fonctionne. Le registre n'apparaît qu'après un build `--mode test`.

Donc la conclusion de l'ADR tenait — mais pour une autre raison que celle écrite, et le garde-fou que j'y proposais aurait produit un faux positif permanent. Un `grep` qui échoue toujours, c'est un gate qu'on finit par désactiver.

Le gate correct est un contrôle à l'exécution : construire sans le drapeau, servir le bundle, vérifier que l'objet est absent. Plus coûteux. C'est le seul qui teste ce qui compte.

Ce que je retiens : **un ADR qui s'appuie sur un mécanisme qu'il n'a pas vérifié se trompe même quand sa conclusion est juste.** Et une décision juste pour de mauvaises raisons ne survit pas au premier changement de contexte.

L'ADR porte maintenant une section « ce que l'implémentation a démenti », avec le tableau des mesures. Elle est plus utile que tout le reste du document.

Vous relisez vos ADR après implémentation, ou ils restent datés du jour de la décision ?
