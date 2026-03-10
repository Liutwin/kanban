// middleware/error.ts
import { Context, Next }                from "@oak/oak";
import { APIErrorCode, APIException, type APIFailure } from "../model/interfaces.ts";

export async function errorMiddleware(ctx: Context, next: Next) {
  try {
    await next();
  } catch (err) {
    if (err instanceof APIException) {
      const body: APIFailure = {
        success: false,
        error: { code: err.code, message: err.message },
      };
      ctx.response.status = err.status;
      ctx.response.body   = body;
      console.warn(`[API] ${err.status} ${err.code}: ${err.message}`);
    } else {
      console.error("[API] Erreur inattendue:", err);
      const body: APIFailure = {
        success: false,
        error: { code: APIErrorCode.SERVER_ERROR, message: "Erreur serveur inattendue" },
      };
      ctx.response.status = 500;
      ctx.response.body   = body;
    }
  }
}
