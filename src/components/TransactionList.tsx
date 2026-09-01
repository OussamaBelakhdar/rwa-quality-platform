import React, { ReactNode } from "react";
import { styled } from "@mui/material/styles";
import { Paper, Button, ListSubheader, Grid, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { isEmpty } from "lodash/fp";

import SkeletonList from "./SkeletonList";
import { TransactionResponseItem, TransactionPagination } from "../models";
import EmptyList from "./EmptyList";
import TransactionInfiniteList from "./TransactionInfiniteList";
import TransferMoneyIllustration from "./SvgUndrawTransferMoneyRywa";

const PREFIX = "TransactionList";

const classes = {
  paper: `${PREFIX}-paper`,
};

const StyledPaper = styled(Paper)(({ theme }) => ({
  [`&.${classes.paper}`]: {
    paddingLeft: theme.spacing(1),
  },
}));

export interface TransactionListProps {
  header: string;
  transactions: TransactionResponseItem[];
  isLoading: Boolean;
  showCreateButton?: Boolean;
  loadNextPage: Function;
  pagination: TransactionPagination;
  filterComponent: ReactNode;
  /** La machine est en `failure` : la requête n'a pas abouti. */
  hasError?: Boolean;
  /** Message porté par la machine, affiché tel quel. */
  errorMessage?: string;
  /** Relance la requête. Sans elle, l'écran d'erreur est une impasse. */
  onRetry?: () => void;
}

const TransactionList: React.FC<TransactionListProps> = ({
  header,
  transactions,
  isLoading,
  showCreateButton,
  loadNextPage,
  pagination,
  filterComponent,
  hasError,
  errorMessage,
  onRetry,
}) => {
  // `!hasError` est la correction de fond : sans lui, une requête en échec
  // retombait sur la liste vide, et un 500 devenait indiscernable d'un compte
  // sans transaction. Trois causes, un seul écran — l'utilisateur ne pouvait
  // pas savoir s'il n'avait rien ou si le service était tombé.
  const showEmptyList = !isLoading && !hasError && transactions?.length === 0;
  const showSkeleton = isLoading && isEmpty(pagination);

  return (
    <StyledPaper className={classes.paper}>
      {filterComponent}
      <ListSubheader component="div">{header}</ListSubheader>
      {showSkeleton && <SkeletonList />}
      {hasError && (
        <Grid
          container
          direction="column"
          justifyContent="center"
          alignItems="center"
          spacing={2}
          style={{ padding: 24 }}
          data-test="transaction-list-error"
        >
          <Grid item>
            <Typography component="h2" variant="h6" color="error">
              Unable to load transactions
            </Typography>
          </Grid>
          <Grid item>
            <Typography
              variant="body2"
              color="textSecondary"
              data-test="transaction-list-error-message"
            >
              {errorMessage}
            </Typography>
          </Grid>
          <Grid item>
            <Button
              variant="contained"
              color="primary"
              data-test="transaction-list-error-retry"
              onClick={() => onRetry && onRetry()}
            >
              Retry
            </Button>
          </Grid>
        </Grid>
      )}
      {transactions.length > 0 && (
        <TransactionInfiniteList
          transactions={transactions}
          loadNextPage={loadNextPage}
          pagination={pagination}
        />
      )}
      {showEmptyList && (
        <EmptyList entity="Transactions">
          <Grid
            container
            direction="column"
            justifyContent="center"
            alignItems="center"
            style={{ width: "100%" }}
            spacing={2}
          >
            <Grid item>
              <TransferMoneyIllustration style={{ height: 200, width: 300, marginBottom: 30 }} />
            </Grid>
            <Grid item>
              {showCreateButton && (
                <Button
                  data-test="transaction-list-empty-create-transaction-button"
                  variant="contained"
                  color="primary"
                  component={RouterLink}
                  to="/transaction/new"
                >
                  Create A Transaction
                </Button>
              )}
            </Grid>
          </Grid>
        </EmptyList>
      )}
    </StyledPaper>
  );
};

export default TransactionList;
