import React, { useEffect, ReactNode } from "react";
import { useMachine } from "@xstate/react";
import {
  TransactionPagination,
  TransactionResponseItem,
  TransactionDateRangePayload,
  TransactionAmountRangePayload,
} from "../models";
import TransactionList from "./TransactionList";
import { personalTransactionsMachine } from "../machines/personalTransactionsMachine";
import { registerScopedService } from "../utils/testHooks";

export interface TransactionPersonalListProps {
  filterComponent: ReactNode;
  dateRangeFilters: TransactionDateRangePayload;
  amountRangeFilters: TransactionAmountRangePayload;
}

const TransactionPersonalList: React.FC<TransactionPersonalListProps> = ({
  filterComponent,
  dateRangeFilters,
  amountRangeFilters,
}) => {
  const [current, send, personalTransactionService] = useMachine(personalTransactionsMachine);
  // Registre du projet (ADR-006) : enregistré au montage, retiré au démontage.
  React.useEffect(
    () => registerScopedService("personalTransactions", personalTransactionService),
    [personalTransactionService]
  );
  const { pageData, results } = current.context;

  // @ts-ignore
  if (window.Cypress) {
    // @ts-ignore
    window.personalTransactionService = personalTransactionService;
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
        header="Personal"
        transactions={results as TransactionResponseItem[]}
        isLoading={current.matches("loading")}
        loadNextPage={loadNextPage}
        pagination={pageData as TransactionPagination}
        showCreateButton={true}
        hasError={current.matches("failure")}
        errorMessage={current.context.message}
        onRetry={() => send("FETCH", { ...dateRangeFilters, ...amountRangeFilters })}
      />
    </>
  );
};

export default TransactionPersonalList;
