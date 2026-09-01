import React from "react";
import { List } from "@mui/material";

import { BankAccount } from "../models";
import BankAccountItem from "./BankAccountItem";
import EmptyList from "./EmptyList";
import ErrorState from "./ErrorState";

export interface BankAccountListProps {
  bankAccounts: BankAccount[];
  deleteBankAccount: Function;
  /** La machine est en `failure` : sans cela, une panne se rendait « No Bank Accounts ». */
  hasError?: Boolean;
  errorMessage?: string;
  onRetry?: () => void;
}

const BankAccountList: React.FC<BankAccountListProps> = ({
  bankAccounts,
  deleteBankAccount,
  hasError,
  errorMessage,
  onRetry,
}) => {
  if (hasError) {
    return <ErrorState entity="bank accounts" message={errorMessage} onRetry={onRetry} />;
  }
  return (
    <>
      {bankAccounts?.length > 0 ? (
        <List data-test="bankaccount-list">
          {bankAccounts.map((bankAccount: BankAccount) => (
            <BankAccountItem
              key={bankAccount.id}
              bankAccount={bankAccount}
              deleteBankAccount={deleteBankAccount}
            />
          ))}
        </List>
      ) : (
        <EmptyList entity="Bank Accounts" />
      )}
    </>
  );
};

export default BankAccountList;
