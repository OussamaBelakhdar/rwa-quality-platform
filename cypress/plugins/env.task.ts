import axios from "axios";

/**
 * Validation d'environnement, exécutée une fois au `before()` global
 * (ARCHITECTURE.md §4 couche L1, §5 « fail-fast »).
 *
 * Sans elle, une variable manquante ou un serveur mal configuré se manifeste
 * au quinzième test sous une forme incompréhensible. Ici, la suite s'arrête
 * en deux secondes en nommant ce qui manque.
 */
export interface RapportEnv {
  apiUrl: string;
  scenarios: string[];
}

export const validerEnvironnement = async (
  apiUrl: string | undefined,
  motDePasse: string | undefined
): Promise<RapportEnv> => {
  if (!apiUrl) {
    throw new Error(
      "expose.apiUrl est absent de cypress.config.ts — la couche L1 ne sait pas où appeler."
    );
  }
  if (!motDePasse) {
    throw new Error(
      "env.defaultPassword est vide — vérifier SEED_DEFAULT_USER_PASSWORD dans .env, .env.local, ou CYPRESS_defaultPassword en CI."
    );
  }

  let scenarios: string[];
  try {
    const { data } = await axios.get<{ scenarios: string[] }>(`${apiUrl}/testData/seed/scenarios`);
    scenarios = data.scenarios;
  } catch (erreur) {
    throw new Error(
      `Les routes /testData ne répondent pas sur ${apiUrl}. La suite exige « yarn dev:test » : sans NODE_ENV de test le routeur n'est pas monté (ADR-007), et sans VITE_TEST_HOOKS le registre XState est absent (ADR-006).`,
      { cause: erreur }
    );
  }

  return { apiUrl, scenarios };
};
