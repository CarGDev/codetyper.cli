import { createStore } from "solid-js/store";
import { createSimpleContext } from "./helper";
import type { Route } from "@tui-solid/types";

interface RouteStore {
  route: Route;
}

interface RouteContextValue {
  get data(): Route;
  navigate: (route: Route) => void;
  goHome: () => void;
  goToSession: (sessionId: string) => void;
  isHome: () => boolean;
  isSession: () => boolean;
  currentSessionId: () => string | null;
}

export const { provider: RouteProvider, use: useRoute } =
  createSimpleContext<RouteContextValue>({
    name: "Route",
    init: () => {
      const initialRoute: Route = { type: "home" };
      const [store, setStore] = createStore<RouteStore>({
        route: initialRoute,
      });

      const navigate = (route: Route): void => {
        setStore("route", route);
      };

      const goHome = (): void => {
        setStore("route", { type: "home" });
      };

      const goToSession = (sessionId: string): void => {
        setStore("route", { type: "session", sessionId });
      };

      const isHome = (): boolean => store.route.type === "home";

      const isSession = (): boolean => store.route.type === "session";

      const currentSessionId = (): string | null => {
        return store.route.type === "session" ? store.route.sessionId : null;
      };

      return {
        get data() {
          return store.route;
        },
        navigate,
        goHome,
        goToSession,
        isHome,
        isSession,
        currentSessionId,
      };
    },
  });
