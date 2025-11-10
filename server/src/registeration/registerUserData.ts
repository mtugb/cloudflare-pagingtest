import { drizzle } from "drizzle-orm/d1";
import { Context } from "hono";
import { Bindings } from "../../types/Binding";
import { deleteCookie, getCookie } from "hono/cookie";
import { REG_SESSION_COOKIE } from "../../constants/registeration";
import { reg_sessions, users } from "../../../schema";
import { and, eq, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";

export const registerUserdata = async (e:Context<{Bindings:Bindings}>) => {
    const db = drizzle(e.env.bucchinote_db);
    const formData = await e.req.formData();
    const sessionId = getCookie(e, REG_SESSION_COOKIE);
    const now = Math.floor(Date.now() / 1000);

    if (typeof sessionId !== "string") {
        return e.json({ ok: false, error: "セッションが無効です" });
    }

    const sessionResult = await db
        .select()
        .from(reg_sessions)
        .where(
            and(
                eq(reg_sessions.session_id, sessionId),
                eq(reg_sessions.stage, 1),
                gt(reg_sessions.expires_at, now)
            )
        )
        .limit(1);

    const session = sessionResult[0];

    if (!session) {
        // Cookie 削除時も path を揃える
        deleteCookie(e, REG_SESSION_COOKIE, { path: "/" });
        return e.json({
            ok: false,
            error: "セッションが無効、または有効期限切れです。最初からやり直してください",
        });
    }

    const name = formData.get("first_name");
    const password = formData.get("password");
    const email = session.email;

    if (typeof name !== "string" || name.trim() === "") {
        return e.json({ ok: false, error: "名前を入力してください" });
    }
    if (typeof password !== "string" || password.length < 8) {
        return e.json({ ok: false, error: "パスワードが短すぎます (8文字以上が必要です)" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db
        .insert(users)
        .values({
            name,
            email,
            password_hash: hashedPassword,
            verified: true,
        })
        .execute();

    await db.delete(reg_sessions).where(eq(reg_sessions.session_id, sessionId));
    deleteCookie(e, REG_SESSION_COOKIE, { path: "/" });

    return e.json({ ok: true });
}