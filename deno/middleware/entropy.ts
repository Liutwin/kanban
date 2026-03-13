import { randomInt } from "node:crypto";
import { Context, Next } from "@oak/oak";
import { APIErrorCode, APIException } from "../model/interfaces.ts";

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// deno-lint-ignore no-unused-vars
export async function entropyMiddleware(ctx: Context, next: Next) {
  const d10 = randomInt(0, 10);

  if (d10 === 9) {
    throw new APIException(APIErrorCode.SERVER_ERROR, 500, "Entropy error :-)");
  }

  if (d10 >= 3 && d10 < 9) {
    const timeout = randomInt(0, 5);

    await delay(timeout * 1000);
  }

  await next();
}