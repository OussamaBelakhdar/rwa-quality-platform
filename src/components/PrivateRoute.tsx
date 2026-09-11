import React from "react";
import { Route, Redirect, RouteProps } from "react-router-dom";

/**
 * `children` est retiré de `RouteProps` et redéclaré en `ReactNode`.
 *
 * `RouteProps["children"]` accepte AUSSI une fonction — la forme
 * `<Route>{({ match }) => …}</Route>` de react-router. Passer cette union à
 * `render`, qui n'attend qu'un nœud, ne satisfait aucune surcharge. Le composant
 * n'a jamais utilisé la forme fonction ; le type le dit enfin.
 */
interface IPrivateRouteProps extends Omit<RouteProps, "children"> {
  isLoggedIn: boolean;
  children?: React.ReactNode;
}

function PrivateRoute({ isLoggedIn, children, ...rest }: IPrivateRouteProps) {
  return (
    <Route
      {...rest}
      render={({ location }) =>
        isLoggedIn ? (
          children
        ) : (
          /* istanbul ignore next */
          <Redirect
            to={{
              pathname: "/signin",
              state: { from: location },
            }}
          />
        )
      }
    />
  );
}

export default PrivateRoute;
