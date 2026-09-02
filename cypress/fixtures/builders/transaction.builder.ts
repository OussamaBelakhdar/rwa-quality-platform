import { DefaultPrivacyLevel, TransactionStatus } from "../../../src/models";
import type { TransactionPagination, TransactionResponseItem } from "../../../src/models";

/**
 * Builders de RÉPONSE de transaction — couche L1 (docs/ARCHITECTURE.md §4).
 *
 * À ne pas confondre avec `cy.createTransaction`, qui écrit dans la base par
 * les endpoints `/testData`. Ici on ne crée rien : on fabrique le corps qu'un
 * stub réseau renverra à la place du backend. C'est ce qui permet d'exercer
 * des valeurs que le vrai backend ne produit jamais (montant négatif, montant
 * hors norme), sans les injecter en base où elles pollueraient d'autres tests.
 *
 * Le type de l'enveloppe vit ici et non dans `@support/types` : les intercepts
 * (L2) l'importent, et une couche n'appelle que la couche inférieure.
 */
export interface ReponseTransactions {
  pageData: TransactionPagination;
  results: TransactionResponseItem[];
}

let compteur = 0;

export const transactionBuilder = (): TransactionBuilder => new TransactionBuilder();

class TransactionBuilder {
  private etat: TransactionResponseItem;

  constructor() {
    compteur += 1;
    const empreinte = `stub-${compteur}-${Math.random().toString(36).slice(2, 8)}`;
    const maintenant = new Date();
    // Defaults réellement valides : `privacyLevel: public` sinon le flux
    // public filtre la transaction, et `senderName`/`receiverName` sinon la
    // ligne se rend sans titre (TransactionTitle les lit directement).
    this.etat = {
      id: empreinte,
      uuid: empreinte,
      source: "",
      // Le backend stocke en CENTIMES : 4200 se rend « $42.00 ».
      amount: 4200,
      description: `Transaction simulée ${compteur}`,
      privacyLevel: DefaultPrivacyLevel.public,
      receiverId: `receiver-${empreinte}`,
      senderId: `sender-${empreinte}`,
      status: TransactionStatus.complete,
      createdAt: maintenant,
      modifiedAt: maintenant,
      likes: [],
      comments: [],
      receiverName: "Beneficiaire Simule",
      receiverAvatar: "",
      senderName: "Emetteur Simule",
      senderAvatar: "",
    };
  }

  /** Montant en CENTIMES, comme le backend le renvoie. */
  withAmount(centimes: number): this {
    this.etat.amount = centimes;
    return this;
  }

  withDescription(description: string): this {
    this.etat.description = description;
    return this;
  }

  build(): TransactionResponseItem {
    return { ...this.etat };
  }
}

/**
 * Enveloppe une liste de transactions dans la forme exacte que
 * `backend/transaction-routes.ts` renvoie — `{ pageData, results }`.
 *
 * `hasNextPages: false` par défaut : un stub qui prétend avoir une page
 * suivante déclenche un second `FETCH` du défilement infini, donc une seconde
 * requête que la spec n'attend pas.
 */
export const reponseTransactions = (
  results: TransactionResponseItem[],
  pagination: Partial<TransactionPagination> = {}
): ReponseTransactions => ({
  pageData: {
    page: 1,
    limit: 10,
    hasNextPages: false,
    totalPages: 1,
    ...pagination,
  },
  results,
});

/**
 * Première transaction d'une réponse, ou une erreur explicite.
 *
 * Trois specs de `e2e/network/` faisaient le même cast puis le même
 * `?? "absente"` : le sentinel transformait une réponse vide en attente de
 * 4 s sur un sélecteur introuvable, loin de la cause. Ici l'échec nomme la
 * cause tout de suite.
 */
export const premiereDe = (corps: ReponseTransactions): TransactionResponseItem => {
  const premiere = corps.results[0];
  if (!premiere) {
    throw new Error("Réponse de transactions vide : la spec en attendait au moins une.");
  }
  return premiere;
};
