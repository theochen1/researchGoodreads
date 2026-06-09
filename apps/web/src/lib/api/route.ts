import { errorResponse } from "./response";

export type BasicRouteHandler = (
  request: Request,
) => Promise<Response> | Response;

export type ContextRouteHandler<TContext> = (
  request: Request,
  context: TContext,
) => Promise<Response> | Response;

export function withApiRoute(handler: BasicRouteHandler): BasicRouteHandler;
export function withApiRoute<TContext = unknown>(
  handler: ContextRouteHandler<TContext>,
): ContextRouteHandler<TContext>;
export function withApiRoute<TContext>(
  handler: BasicRouteHandler | ContextRouteHandler<TContext>,
): BasicRouteHandler | ContextRouteHandler<TContext> {
  return async (request, context) => {
    try {
      return await (
        handler as (
          request: Request,
          context?: TContext,
        ) => Promise<Response> | Response
      )(request, context);
    } catch (error) {
      return errorResponse(error);
    }
  };
}
