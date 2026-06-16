import { useServerFn } from "@tanstack/react-start";
import { useCallback } from "react";

/**
 * Type-safe wrapper around `useServerFn` that returns a plain
 * `(input) => Promise<output>` function. Avoids the upstream
 * `OptionalFetcherDataOptions` typing issue where `.data` isn't
 * recognized on the call site.
 *
 * Usage:
 *   const list = useTypedServerFn(listOpportunities);
 *   const rows = await list({ q: "foo" });           // typed input
 *
 *   const stats = useTypedServerFn(getInvestorStats);
 *   const s = await stats();                          // no-input fn
 */
type AnyServerFn = (...args: any[]) => Promise<any>;

// Extract the `data` input type from a server fn signature.
// Handles three shapes:
//  - required input:  (opts: { data: D, ... }) => Promise<R>
//  - optional input:  (opts?: { data?: D, ... }) => Promise<R>
//  - no input:        (opts?: { ... }) => Promise<R>  // no `data` key
type ServerFnInput<F extends AnyServerFn> =
  NonNullable<Parameters<F>[0]> extends { data: infer D }
    ? D
    : NonNullable<Parameters<F>[0]> extends { data?: infer D }
      ? D | undefined
      : undefined;

type ServerFnOutput<F extends AnyServerFn> = Awaited<ReturnType<F>>;

export function useTypedServerFn<F extends AnyServerFn>(
  fn: F,
): undefined extends ServerFnInput<F>
  ? (input?: ServerFnInput<F>) => Promise<ServerFnOutput<F>>
  : (input: ServerFnInput<F>) => Promise<ServerFnOutput<F>> {
  const bound = useServerFn(fn as any) as unknown as (opts?: {
    data?: unknown;
  }) => Promise<ServerFnOutput<F>>;

  return useCallback(
    (input?: unknown) =>
      input === undefined ? bound() : bound({ data: input }),
    [bound],
  ) as any;
}
