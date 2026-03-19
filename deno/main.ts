// main.ts
import { Application } from "@oak/oak";
import { oakCors }     from "@tajpouria/cors";

import { errorMiddleware } from "./middleware/error.ts";
import authRouter          from "./routes/auth.ts";
import proxyRouter         from "./routes/proxy.ts";
import wsRouter from "./routes/websockets.ts";

// Configuration réseau
const PROTOCOL = "http";
const PORT     = Number(Deno.env.get("PORT") ?? 8080);
const HOSTNAME = Deno.env.get("HOST") ?? "0.0.0.0"
const ADDRESS  = `${PROTOCOL}://${HOSTNAME}:${PORT}`;

const app = new Application();

// Middlewares globaux
app.use(oakCors());
app.use(errorMiddleware);

// Routes
app.use(authRouter.routes(),  authRouter.allowedMethods());
app.use(wsRouter.routes(),    wsRouter.allowedMethods());
app.use(proxyRouter.routes(), proxyRouter.allowedMethods());

app.addEventListener("listen", () =>
  console.log(`🚀 Serveur Deno démarré sur ${ADDRESS}`)
);

if (import.meta.main) {
  await app.listen({ hostname: HOSTNAME, port: PORT });
}

export { app };