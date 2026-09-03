require("dotenv").config();

import shortid from "shortid";
import { faker } from "@faker-js/faker";
import bcrypt from "bcryptjs";
import {
  map,
  flattenDeep,
  times,
  concat,
  sample,
  reject,
  uniqBy,
  flow,
  get,
  curry,
  filter,
  isEqual,
  flattenDepth,
  negate,
  find,
  compact,
  differenceBy,
  sampleSize,
} from "lodash/fp";
import {
  BankAccount,
  User,
  DefaultPrivacyLevel,
  Like,
  Comment,
  PaymentNotification,
  NotificationType,
  LikeNotification,
  CommentNotification,
  Transaction,
  TransactionStatus,
  TransactionRequestStatus,
  TransactionScenario,
  FakeTransaction,
  Contact,
  BankTransferType,
  BankTransfer,
  PaymentNotificationStatus,
} from "../src/models";
import { getFakeAmount } from "../src/utils/transactionUtils";

export const userbaseSize = +process.env.SEED_USERBASE_SIZE!;
export const contactsPerUser = +process.env.SEED_CONTACTS_PER_USER!;
export const paymentsPerUser = +process.env.SEED_PAYMENTS_PER_USER!;
export const requestsPerUser = +process.env.SEED_REQUESTS_PER_USER!;
export const bankAccountsPerUser = +process.env.SEED_BANK_ACCOUNTS_PER_USER!;
export const likesPerUser = +process.env.SEED_LIKES_PER_USER!;
export const commentsPerUser = +process.env.SEED_COMMENTS_PER_USER!;
export const notificationsPerUser = +process.env.SEED_NOTIFICATIONS_PER_USER!;
export const bankTransfersPerUser = +process.env.SEED_BANK_TRANSFERS_PER_USER!;
export const defaultPassword = process.env.SEED_DEFAULT_USER_PASSWORD!;

export const paymentVariations = 2;
export const requestVariations = 3;
// transactions per user = paymentsPerUser * paymentVariations * sender/receiver(2)
// +
// requestsPerUser * requestVariations * sender/receiver(2)
export const transactionsPerUser =
  paymentsPerUser * paymentVariations * 2 + requestsPerUser * requestVariations * 2;
export const totalTransactions = userbaseSize! * transactionsPerUser!;
export const totalLikes = userbaseSize! * likesPerUser!;
export const totalComments = userbaseSize! * commentsPerUser!;
export const totalNotifications = userbaseSize! * notificationsPerUser!;
export const totalContacts = userbaseSize! * contactsPerUser!;
export const totalBankTransfers = userbaseSize! * bankTransfersPerUser * 2; // deposit & withdrawal

export const isPayment = (type: string) => type === "payment";
export const passwordHash = bcrypt.hashSync(defaultPassword, 10);

const requestScenarios: TransactionScenario[] = [
  {
    status: TransactionStatus.pending,
    requestStatus: "pending",
  },
  {
    status: TransactionStatus.complete,
    requestStatus: "accepted",
  },
  {
    status: TransactionStatus.complete,
    requestStatus: "rejected",
  },
];

const paymentScenarios: TransactionScenario[] = [
  {
    status: TransactionStatus.pending,
    requestStatus: "",
  },
  {
    status: TransactionStatus.complete,
    requestStatus: "",
  },
];

export const getRandomTransactions = (baseCount: number, baseTransactions: Transaction[]) =>
  compact(
    uniqBy(
      "id",
      times(() => sample(baseTransactions), baseCount * 3)
    )
  ).slice(0, baseCount);

export const getUserAvatar = (identifier: string) => {
  return `https://api.dicebear.com/9.x/pixel-art/svg?seed=${encodeURIComponent(identifier)}`;
};

export const createFakeUser = (): User => {
  const id = shortid();
  return {
    id,
    uuid: faker.string.uuid(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    username: faker.internet.username(),
    password: passwordHash,
    email: faker.internet.email(),
    // faker 6 : `phone.phoneNumberFormat(0)` rendait `###-###-####`. La
    // fonction n'existe plus en 10, et aucun `phone.number({ style })` ne
    // reproduit cette forme : `national` donne `(654) 331-0307`, le défaut
    // ajoute une extension (`691-531-1666 x9017`). Le seed est un CONTRAT
    // de données — le formulaire de réglages valide le téléphone par regex
    // — donc la forme est réaffirmée explicitement plutôt que déléguée à
    // un style dont la sortie change entre versions.
    phoneNumber: faker.helpers.fromRegExp("[0-9]{3}-[0-9]{3}-[0-9]{4}"),
    avatar: getUserAvatar(id),
    defaultPrivacyLevel: faker.helpers.arrayElement([
      DefaultPrivacyLevel.public,
      DefaultPrivacyLevel.private,
      DefaultPrivacyLevel.contacts,
    ]),
    balance: faker.number.int({ min: 10000, max: 200000 }),
    createdAt: faker.date.past(),
    modifiedAt: faker.date.recent(),
  };
};

// @ts-ignore
export const createSeedUsers = () => times(() => createFakeUser(), userbaseSize);

export const createContact = (userId: User["id"], contactUserId: User["id"]) => ({
  id: shortid(),
  uuid: faker.string.uuid(),
  userId,
  contactUserId,
  createdAt: faker.date.past(),
  modifiedAt: faker.date.recent(),
});

// returns a random user other than the one passed in
export const getOtherRandomUser = curry(
  (seedUsers: User[], userId: User["id"]): User => flow(reject(["id", userId]), sample)(seedUsers)
);

export const randomContactsForUser = curry((seedUsers: User[], user: User) =>
  uniqBy(
    "id",
    times(() => getOtherRandomUser(seedUsers, user.id), contactsPerUser * 3)
  ).slice(0, contactsPerUser)
);
export const generateRandomContactsForUser = (seedUsers: User[]) =>
  map((user: User) => ({
    userId: user.id,
    contacts: randomContactsForUser(seedUsers, user),
  }))(seedUsers);

export const createContactsForUser = curry((randomContacts: any) =>
  flattenDeep(
    map((item: any) =>
      map((contact: User) => createContact(item.userId, contact.id))(item.contacts)
    )(randomContacts)
  )
);

export const createSeedContacts = (seedUsers: User[]) => {
  return flow(generateRandomContactsForUser, createContactsForUser)(seedUsers);
};

export const createSeedBankAccounts = (seedUsers: User[]) =>
  map((user: User): BankAccount => {
    return {
      id: shortid(),
      uuid: faker.string.uuid(),
      userId: user.id,
      bankName: `${faker.company.name()} Bank`,
      accountNumber: faker.finance.accountNumber(10),
      routingNumber: faker.finance.accountNumber(9),
      isDeleted: false,
      createdAt: faker.date.past(),
      modifiedAt: faker.date.recent(),
    };
  })(seedUsers);

// Transactions

export const createTransaction = (
  type: "payment" | "request",
  account: BankAccount,
  details: FakeTransaction
): Transaction => {
  const { senderId, receiverId } = details;

  const createdAt = faker.date.past();
  const modifiedAt = faker.date.recent();

  const status = faker.helpers.arrayElement([
    TransactionStatus.pending,
    TransactionStatus.complete,
  ]);

  let requestStatus = "";

  if (type === "request") {
    requestStatus = TransactionRequestStatus.pending;

    if (status === TransactionStatus.complete) {
      requestStatus = faker.helpers.arrayElement([
        TransactionRequestStatus.accepted,
        TransactionRequestStatus.rejected,
      ]);
    }
  }

  const requestResolvedAt =
    requestStatus === TransactionRequestStatus.pending
      ? ""
      : faker.date.future({ refDate: createdAt });

  return {
    id: shortid(),
    uuid: faker.string.uuid(),
    source: account.id,
    amount: getFakeAmount(),
    description: isPayment(type)
      ? `Payment: ${senderId} to ${receiverId}`
      : `Request: ${receiverId} to ${senderId}`,
    privacyLevel: faker.helpers.arrayElement([
      DefaultPrivacyLevel.public,
      DefaultPrivacyLevel.private,
      DefaultPrivacyLevel.contacts,
    ]),
    receiverId,
    senderId,
    balanceAtCompletion: getFakeAmount(),
    status,
    requestStatus,
    requestResolvedAt,
    createdAt,
    modifiedAt,
  };
};

export const createPayment = (account: BankAccount, user: User, randomUser: User) => {
  const allScenarios = paymentScenarios.map((details) => {
    const paymentTransaction = createTransaction("payment", account, {
      senderId: user.id,
      receiverId: randomUser.id,
      ...details,
    });

    const paymentInverseTransaction = createTransaction("payment", account, {
      senderId: randomUser.id,
      receiverId: user.id,
      ...details,
    });

    return [paymentTransaction, paymentInverseTransaction];
  });

  return flattenDeep(allScenarios);
};

export const createRequest = (account: BankAccount, user: User, randomUser: User) => {
  const allScenarios = requestScenarios.map((details) => {
    const requestTransaction = createTransaction("request", account, {
      senderId: user.id,
      receiverId: randomUser.id,
      ...details,
    });

    const requestInverseTransaction = createTransaction("request", account, {
      senderId: randomUser.id,
      receiverId: user.id,
      ...details,
    });

    return [requestTransaction, requestInverseTransaction];
  });

  return flattenDeep(allScenarios);
};

export const getBankAccountsByUserId = (
  seedBankAccounts: BankAccount[],
  userId: User["id"]
): BankAccount[] => filter(flow(get("userId"), isEqual(userId)), seedBankAccounts);

export const getTransactionsByUserId = (
  seedTransactions: Transaction[],
  userId: User["id"]
): Transaction[] =>
  filter(
    ({ senderId, receiverId }) => isEqual(senderId, userId) || isEqual(receiverId, userId),
    seedTransactions
  );

export const createSeedTransactions = (seedUsers: User[], seedBankAccounts: BankAccount[]) =>
  flattenDepth(
    2,
    map((user: User): Transaction[] => {
      const accounts = getBankAccountsByUserId(seedBankAccounts, user.id);

      return flattenDepth(
        2,
        map((account: BankAccount): Transaction[] => {
          const randomUser = getOtherRandomUser(seedUsers, user.id);
          // @ts-ignore
          const payments = times(() => createPayment(account, user, randomUser), paymentsPerUser);
          // @ts-ignore
          const requests = times(() => createRequest(account, user, randomUser), requestsPerUser);

          const allScenarios = flattenDeep(concat(payments, requests));
          const requestedTransaction = filter(requestScenarios[0], allScenarios)[0];
          const chargedTransaction = filter(requestScenarios[1], allScenarios)[0];
          const paidTransaction = filter(paymentScenarios[1], allScenarios)[0];

          const testTransactions = [paidTransaction, requestedTransaction, chargedTransaction];

          const remainingScenarios = differenceBy(get("id"), allScenarios, testTransactions);

          // @ts-ignore
          return flattenDeep(concat(testTransactions, remainingScenarios));
        })(accounts)
      );
    })(seedUsers)
  );

export const createFakeLike = (userId: string, transactionId: string): Like => ({
  id: shortid(),
  uuid: faker.string.uuid(),
  userId,
  transactionId,
  createdAt: faker.date.past(),
  modifiedAt: faker.date.recent(),
});

export const getPublicTransactionsForOtherUsers = (
  seedTransactions: Transaction[],
  userId: User["id"]
): Transaction[] =>
  flow(
    filter({ privacyLevel: DefaultPrivacyLevel.public }),
    filter(flow(get("senderId"), negate(isEqual(userId)))),
    filter(flow(get("receiverId"), negate(isEqual(userId))))
  )(seedTransactions);

export const createSeedLikes = (seedUsers: User[], seedTransactions: Transaction[]) =>
  flattenDeep(
    map((user: User): Like[] => {
      const transactions = getPublicTransactionsForOtherUsers(seedTransactions, user.id);

      // choose random transactions
      const randomTransactions = getRandomTransactions(10, transactions);

      // get a slice of random transactions
      const selectedTransactions = sampleSize(
        likesPerUser,
        compact(randomTransactions.slice(0, likesPerUser * 2))
      );

      // iterate over transactions and like
      return selectedTransactions.map((transaction) => createFakeLike(user.id, transaction!.id));
    })(seedUsers)
  );

export const createFakeComment = (userId: string, transactionId: string): Comment => ({
  id: shortid(),
  uuid: faker.string.uuid(),
  content: faker.lorem.words(),
  userId,
  transactionId,
  createdAt: faker.date.past(),
  modifiedAt: faker.date.recent(),
});

export const createSeedComments = (seedUsers: User[], seedTransactions: Transaction[]) =>
  flattenDeep(
    map((user: User): Comment[] => {
      const transactions = getPublicTransactionsForOtherUsers(seedTransactions, user.id);

      // choose random transactions
      const randomTransactions = getRandomTransactions(5, transactions);

      // get a slice of random transactions
      const selectedTransactions = randomTransactions.slice(0, commentsPerUser);

      // iterate over transactions and comment
      return selectedTransactions.map((transaction) => createFakeComment(user.id, transaction!.id));
    })(seedUsers)
  );

export const createFakePaymentNotification = (
  userId: string,
  transaction: Transaction,
  status: PaymentNotificationStatus
): PaymentNotification => ({
  id: shortid(),
  uuid: faker.string.uuid(),
  userId,
  transactionId: transaction.id,
  status,
  isRead: false,
  createdAt: faker.date.past(),
  modifiedAt: faker.date.recent(),
});

export const createFakeLikeNotification = (
  userId: string,
  transactionId: string,
  likeId: string
): LikeNotification => ({
  id: shortid(),
  uuid: faker.string.uuid(),
  userId,
  likeId,
  transactionId,
  isRead: false,
  createdAt: faker.date.past(),
  modifiedAt: faker.date.recent(),
});

export const createFakeCommentNotification = (
  userId: string,
  transactionId: string,
  commentId: string
): CommentNotification => ({
  id: shortid(),
  uuid: faker.string.uuid(),
  userId,
  commentId,
  transactionId,
  isRead: false,
  createdAt: faker.date.past(),
  modifiedAt: faker.date.recent(),
});

// `intersectionWith` de lodash/fp typait ses deux paramètres positionnellement
// jusqu'à @types/lodash 4.14 ; depuis 4.17 il les type par l'UNION des deux
// tableaux, et `{ transactionId }` ne se déstructure plus depuis
// `Transaction | Like`. Le code était correct — lodash compare bien un élément
// du premier tableau à un élément du second — mais la définition ne le disait
// plus. Annoter explicitement empire les choses : la résolution de surcharge
// s'effondre et rend quatre erreurs au lieu de deux.
//
// `filter`/`some` dit exactement la même chose sans dépendre d'aucun typage
// tiers. Équivalence vérifiée sur quatre cas ; la seule divergence apparaît si
// `transactions` contient un doublon, que `intersectionWith` écraserait
// silencieusement. Elle ne peut pas se produire ici :
// `getPublicTransactionsForOtherUsers` est une chaîne de trois `filter`, qui
// n'introduit pas de doublon que son entrée n'avait pas.
const getTransactionsWithLikes = (transactions: Transaction[], seedLikes: Like[]) =>
  transactions.filter((transaction) =>
    seedLikes.some((like) => like.transactionId === transaction.id)
  );

const getLikeByTransactionId = (transactionId: Transaction["id"], seedLikes: Like[]) =>
  find({ transactionId }, seedLikes) as Like;

const getTransactionsWithComments = (transactions: Transaction[], seedComments: Comment[]) =>
  transactions.filter((transaction) =>
    seedComments.some((comment) => comment.transactionId === transaction.id)
  );

const getCommentByTransactionId = (transactionId: Transaction["id"], seedComments: Comment[]) =>
  find({ transactionId }, seedComments) as Comment;

export const createSeedNotifications = (
  seedUsers: User[],
  seedTransactions: Transaction[],
  seedLikes: Like[],
  seedComments: Comment[]
) =>
  flattenDeep(
    map((user: User): NotificationType[] => {
      const transactions = getPublicTransactionsForOtherUsers(seedTransactions, user.id);

      const transactionsWithLikes = getTransactionsWithLikes(transactions, seedLikes);

      const transactionsWithComments = getTransactionsWithComments(transactions, seedComments);

      const likeTransaction = sample(compact(getRandomTransactions(5, transactionsWithLikes)));
      const like = getLikeByTransactionId(likeTransaction!.id, seedLikes);
      const likeNotification = createFakeLikeNotification(user.id, likeTransaction!.id, like!.id);

      const commentTransaction = sample(
        compact(getRandomTransactions(5, transactionsWithComments))
      );
      const comment = getCommentByTransactionId(commentTransaction!.id, seedComments);
      // comment notification
      const commentNotification = createFakeCommentNotification(
        user.id,
        commentTransaction!.id,
        comment!.id
      );

      // choose random transactions
      const randomTransactions = getRandomTransactions(notificationsPerUser - 2, transactions);

      const paymentRequestNotifications = randomTransactions.map((transaction) =>
        createFakePaymentNotification(user.id, transaction!, PaymentNotificationStatus.requested)
      );

      const paymentReceivedNotifications = randomTransactions.map((transaction) =>
        createFakePaymentNotification(user.id, transaction!, PaymentNotificationStatus.received)
      );

      let allNotifications = [likeNotification, commentNotification];

      return flattenDeep(
        // @ts-ignore
        concat(allNotifications, [paymentRequestNotifications, paymentReceivedNotifications])
      ) as NotificationType[];
    })(seedUsers)
  );

export const createBankTransfer = (
  transferType: BankTransferType,
  userId: User["id"],
  transactionId: Transaction["id"],
  bankAccountId: BankAccount["id"]
): BankTransfer => ({
  id: shortid(),
  uuid: faker.string.uuid(),
  userId,
  source: bankAccountId,
  amount: getFakeAmount(),
  type: transferType,
  transactionId,
  createdAt: faker.date.past(),
  modifiedAt: faker.date.recent(),
});

export const createSeedBankTransfers = (
  seedUsers: User[],
  seedTransactions: Transaction[],
  seedBankAccounts: BankAccount[]
) =>
  flattenDepth(
    2,
    map((user: User): BankTransfer[] => {
      const userTransactions: Transaction[] = getTransactionsByUserId(seedTransactions, user.id);
      const bankAccounts = getBankAccountsByUserId(seedBankAccounts, user.id);

      // choose random transactions
      const randomTransactions = getRandomTransactions(
        bankTransfersPerUser,
        userTransactions
      ) as Transaction[];

      return flattenDepth(
        2,
        map((transaction: Transaction): BankTransfer[] => {
          const deposit = createBankTransfer(
            BankTransferType.deposit,
            user.id,
            transaction.id,
            bankAccounts[0].id
          );
          const withdrawal = createBankTransfer(
            BankTransferType.withdrawal,
            user.id,
            transaction.id,
            bankAccounts[0].id
          );

          return [deposit, withdrawal];
        })(randomTransactions)
      );
    })(seedUsers)
  );

export const buildDatabase = () => {
  const seedUsers: User[] = createSeedUsers();
  const seedContacts: Contact[] = createSeedContacts(seedUsers);
  const seedBankAccounts: BankAccount[] = createSeedBankAccounts(seedUsers);
  const seedTransactions: Transaction[] = createSeedTransactions(seedUsers, seedBankAccounts);
  const seedLikes: Like[] = createSeedLikes(seedUsers, seedTransactions);
  const seedComments: Comment[] = createSeedComments(seedUsers, seedTransactions);
  const seedNotifications: NotificationType[] = createSeedNotifications(
    seedUsers,
    seedTransactions,
    seedLikes,
    seedComments
  );
  const seedBankTransfers: BankTransfer[] = createSeedBankTransfers(
    seedUsers,
    seedTransactions,
    seedBankAccounts
  );

  return {
    users: seedUsers,
    contacts: seedContacts,
    bankaccounts: seedBankAccounts,
    transactions: seedTransactions,
    likes: seedLikes,
    comments: seedComments,
    notifications: seedNotifications,
    banktransfers: seedBankTransfers,
  };
};
