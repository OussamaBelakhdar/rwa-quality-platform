import React, { useEffect, ReactNode } from "react";
import { useMachine } from "@xstate/react";
import {
  TransactionPagination,
  TransactionResponseItem,
  TransactionDateRangePayload,
  TransactionAmountRangePayload,
} from "../models";
import TransactionList from "./TransactionList";
import { contactsTransactionsMachine } from "../machines/contactsTransactionsMachine";
import { registerScopedService } from "../utils/testHooks";

export interface TransactionContactListProps {
  filterComponent: ReactNode;
  dateRangeFilters: TransactionDateRangePayload;
  amountRangeFilters: TransactionAmountRangePayload;
}

const TransactionContactsList: React.FC<TransactionContactListProps> = ({
  filterComponent,
  dateRangeFilters,
  amountRangeFilters,
}) => {
  const [current, send, contactTransactionService] = useMachine(contactsTransactionsMachine);
  // Registre du projet (ADR-006) : enregistré au montage, retiré au démontage.
  React.useEffect(
    () => registerScopedService("contactsTransactions", contactTransactionService),
    [contactTransactionService]
  );
  const { pageData, results } = current.context;

  // @ts-ignore
  if (window.Cypress) {
    // @ts-ignore
    window.contactTransactionService = contactTransactionService;
  }

  useEffect(() => {
    send("FETCH", { ...dateRangeFilters, ...amountRangeFilters });
  }, [send, dateRangeFilters, amountRangeFilters]);

  const loadNextPage = (page: number) =>
    send("FETCH", { page, ...dateRangeFilters, ...amountRangeFilters });

  return (
    <>
      <TransactionList
        filterComponent={filterComponent}
        header="Contacts"
        transactions={results as TransactionResponseItem[]}
        isLoading={current.matches("loading")}
        loadNextPage={loadNextPage}
        pagination={pageData as TransactionPagination}
        showCreateButton
        hasError={current.matches("failure")}
        errorMessage={current.context.message}
        onRetry={() => send("FETCH", { ...dateRangeFilters, ...amountRangeFilters })}
      />
    </>
  );
};

export default TransactionContactsList;
