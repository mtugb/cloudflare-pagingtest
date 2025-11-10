import { Context, Hono } from "hono";
import { handle } from "hono/cloudflare-pages";
import { api } from "../../server/api";
import { Bindings } from "../../server/types/Binding";
import { Variables } from "../../server/types/Variables";

const app = new Hono<{ Bindings: Bindings, Variables:Variables }>();

// app.get("/app",appMiddleware);

app.route("/api", api);

export const onRequest = handle(app);
