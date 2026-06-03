// ESM loader stub: intercepts `server-only` and resolves to an empty module.
export function resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") {
    return { shortCircuit: true, url: "data:text/javascript," };
  }
  return nextResolve(specifier, context);
}
