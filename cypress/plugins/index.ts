/**
 * Point d'entrée des tâches Node (couche L1).
 *
 * `.claude/rules/typescript.md` place ici le contrat `TaskMap` ; ce fichier
 * le réexporte pour que la règle et l'arborescence disent la même chose.
 */
export { enregistrerTachesDb } from "./db.task";
export type { NouvelleTransaction, NouvelUtilisateur, TaskMap } from "./db.task";
export { validerEnvironnement } from "./env.task";
export type { RapportEnv } from "./env.task";
