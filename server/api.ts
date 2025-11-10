import { Hono } from "hono";
import { Bindings } from "./types/Binding";
import { registerEmail } from "./src/registeration/registerEmail";
import { verifyEmail } from "./src/registeration/verifyEmail";
import { drizzle } from "drizzle-orm/d1";
import { deleteCookie, getCookie } from "hono/cookie";
import { REG_SESSION_COOKIE } from "./constants/registeration";
import { reg_sessions, users } from "../schema";
import { and, eq, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { registerUserdata } from "./src/registeration/registerUserData";
import { login } from "./src/login/login";

const api = new Hono<{ Bindings: Bindings }>();

/** =========================
 *  Step 1: メールアドレス登録
 *  ========================= */
api.post("/registerEmail", registerEmail);

/** =========================
 *  Step 2: 認証コード検証
 *  ========================= */
api.post("/verifyEmail", verifyEmail);

/** =========================
 *  Step 3: ユーザーデータ登録
 *  ========================= */
api.post("/registerUserdata", registerUserdata);


api.post("/login", login);

api.get("/auth/check", login);

export {api};