import { Machine, assign } from "xstate";
import { concat } from "lodash/fp";

export interface DataSchema {
  states: {
    idle: {};
    loading: {};
    updating: {};
    creating: {};
    deleting: {};
    success: {
      states: {
        unknown: {};
        withData: {};
        withoutData: {};
      };
    };
    failure: {};
  };
}

type SuccessEvent = { type: "SUCCESS"; results: any[]; pageData: object };
type FailureEvent = { type: "FAILURE"; message: string };
export type DataEvents =
  | { type: "FETCH" }
  | { type: "UPDATE" }
  | { type: "CREATE" }
  | { type: "DELETE" }
  | SuccessEvent
  | FailureEvent;

export interface DataContext {
  pageData?: object;
  results?: any[];
  message?: string;
}

/**
 * Message lisible tiré d'un événement d'erreur XState.
 *
 * `onError` produit `{ type: "error.platform.<id>", data: <erreur> }` ; une
 * erreur axios est une `Error`, donc porte `message` (« Request failed with
 * status code 500 », « Network Error »). Tout autre forme retombe sur un
 * libellé générique plutôt que sur `undefined`.
 */
const messageDErreur = (event: unknown): string => {
  const data = (event as { data?: unknown })?.data;
  if (data instanceof Error && data.message) return data.message;
  if (typeof data === "string" && data) return data;
  return "Something went wrong.";
};

export const dataMachine = (machineId: string) =>
  Machine<DataContext, DataSchema, DataEvents>(
    {
      id: machineId,
      initial: "idle",
      context: {
        pageData: {},
        results: [],
        message: undefined,
      },
      states: {
        idle: {
          on: {
            FETCH: "loading",
            CREATE: "creating",
            UPDATE: "updating",
            DELETE: "deleting",
          },
        },
        loading: {
          invoke: {
            src: "fetchData",
            onDone: { target: "success" },
            onError: { target: "failure", actions: "setMessage" },
          },
        },
        updating: {
          invoke: {
            src: "updateData",
            onDone: { target: "loading" },
            onError: { target: "failure", actions: "setMessage" },
          },
        },
        creating: {
          invoke: {
            src: "createData",
            onDone: { target: "loading" },
            onError: { target: "failure", actions: "setMessage" },
          },
        },
        deleting: {
          invoke: {
            src: "deleteData",
            onDone: { target: "loading" },
            onError: { target: "failure", actions: "setMessage" },
          },
        },
        success: {
          entry: ["setResults", "setPageData"],
          on: {
            FETCH: "loading",
            CREATE: "creating",
            UPDATE: "updating",
            DELETE: "deleting",
          },
          initial: "unknown",
          states: {
            unknown: {
              on: {
                "": [{ target: "withData", cond: "hasData" }, { target: "withoutData" }],
              },
            },
            withData: {},
            withoutData: {},
          },
        },
        failure: {
          entry: ["setMessage"],
          on: {
            FETCH: "loading",
          },
        },
      },
    },
    {
      actions: {
        setResults: assign((ctx: DataContext, event: any) => ({
          results:
            event.data && event.data.pageData && event.data.pageData.page > 1
              ? concat(ctx.results, event.data.results)
              : event.data.results,
        })),
        setPageData: assign((ctx: DataContext, event: any) => ({
          pageData: event.data.pageData,
        })),

        // XState v4 range l'erreur d'un `invoke` dans `event.data`. Cette
        // action lisait `event.message` : le message était donc TOUJOURS
        // `undefined`, et l'état `failure` ne capturait rien d'exploitable.
        setMessage: assign((ctx, event) => ({
          message: messageDErreur(event),
        })),
      },
      guards: {
        hasData: (ctx: DataContext, event) => !!ctx.results && ctx.results.length > 0,
      },
    }
  );
