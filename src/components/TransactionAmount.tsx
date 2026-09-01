import React from "react";
import { styled } from "@mui/material/styles";
import { Typography } from "@mui/material";
import { TransactionResponseItem } from "../models";
import { isRequestTransaction, formatAmount } from "../utils/transactionUtils";

const PREFIX = "TransactionAmount";

const classes = {
  amountPositive: `${PREFIX}-amountPositive`,
  amountNegative: `${PREFIX}-amountNegative`,
};

const StyledTypography = styled(Typography)(({ theme }) => ({
  [`&.${classes.amountPositive}`]: {
    fontSize: 24,
    [theme.breakpoints.down("md")]: {
      fontSize: theme.typography.body1.fontSize,
    },
    color: "#4CAF50",
  },

  [`&.${classes.amountNegative}`]: {
    fontSize: 24,
    [theme.breakpoints.down("md")]: {
      fontSize: theme.typography.body1.fontSize,
    },
    color: "red",
  },
})) as typeof Typography;

const TransactionAmount: React.FC<{
  transaction: TransactionResponseItem;
}> = ({ transaction }) => {
  return (
    <StyledTypography
      data-test={`transaction-amount-${transaction.id}`}
      className={
        isRequestTransaction(transaction) ? classes.amountPositive : classes.amountNegative
      }
      display="inline"
      component="span"
      color="primary"
    >
      {/*
        Le signe affiché est le SENS de la transaction — « + » pour une demande
        reçue, « - » pour un paiement émis — et non le signe du nombre. Le
        montant est donc rendu en valeur absolue.

        Sans `Math.abs`, un montant négatif produisait deux signes : « -$5.00 »
        rendu par `formatAmount` venait s'ajouter au « - » du sens, et la ligne
        affichait « --$5.00 ». `backend/validators.ts:87` ne valide `amount`
        qu'avec `isNumeric()`, sans borne inférieure : le cas est atteignable.

        Le `transaction.amount &&` a disparu avec : sur un montant de 0 il
        rendait le nombre `0` au lieu de « $0.00 », React affichant `0` tel
        quel. `amount` est requis par le modèle, la garde ne protégeait rien.
      */}
      {isRequestTransaction(transaction) ? "+" : "-"}
      {formatAmount(Math.abs(transaction.amount))}
    </StyledTypography>
  );
};

export default TransactionAmount;
