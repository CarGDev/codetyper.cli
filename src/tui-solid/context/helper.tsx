import { createContext, Show, useContext, type ParentProps } from "solid-js";

interface ContextInput<T, Props extends Record<string, unknown>> {
  name: string;
  init: ((input: Props) => T) | (() => T);
}

interface ContextOutput<T, Props extends Record<string, unknown>> {
  provider: (props: ParentProps<Props>) => ReturnType<typeof Show>;
  use: () => T;
}

export function createSimpleContext<
  T,
  Props extends Record<string, unknown> = Record<string, unknown>,
>(input: ContextInput<T, Props>): ContextOutput<T, Props> {
  const ctx = createContext<T>();

  return {
    provider: (props: ParentProps<Props>) => {
      const init = input.init(props as Props);
      const initWithReady = init as T & { ready?: boolean };
      return (
        <Show
          when={
            initWithReady.ready === undefined || initWithReady.ready === true
          }
        >
          <ctx.Provider value={init}>{props.children}</ctx.Provider>
        </Show>
      );
    },
    use() {
      const value = useContext(ctx);
      if (value === undefined) {
        throw new Error(
          `${input.name} context must be used within a ${input.name}Provider`,
        );
      }
      return value;
    },
  };
}
