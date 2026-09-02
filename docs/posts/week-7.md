# Semaine 7 — brouillon LinkedIn

Ma CI affichait quatre tests en échec. Il y en avait vingt-deux.

La différence tient à une option : `retries: { runMode: 2 }`. Cypress rejoue un test qui échoue, jusqu'à trois fois. Un test instable à 50 % survit donc une fois sur huit — et disparaît du rapport.

Même suite, même application :

```
retries à zéro  →  22 tests instables, 37,93 %
retries à deux  →   4 échecs
```

Dix-huit masqués. Et la durée qui passe de 36 secondes à 2 min 17 : un pipeline lent est souvent un pipeline qui réessaie.

Une équipe qui ne lit que le second chiffre conclut « quatre tests flaky, quarantaine ». Elle passe à côté du vrai fait : l'application échouait une fois sur deux sur sa requête principale.

Les 22 tests n'avaient qu'une cause. La quarantaine n'était pas la réponse — elle isole un test instable, elle ne fait pas taire une application cassée.

Vos retries, vous savez combien de tests ils vous cachent ?
