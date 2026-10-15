import { AsyncLocalStorage } from "node:async_hooks";

export const requestContext = new AsyncLocalStorage<{ request: Request }>();

export function getRequestContext() {
  return requestContext.getStore()?.request;
}
