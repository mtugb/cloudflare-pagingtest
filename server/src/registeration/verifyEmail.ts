import { and, eq, gt } from "drizzle-orm";
import { reg_sessions } from "../../../schema";
import { drizzle } from "drizzle-orm/d1";
import { getCookie } from "hono/cookie";
import { Context } from "hono";
import { Bindings } from "../../types/Binding";
import { REG_SESSION_COOKIE, TOKEN_DIGITS } from "../../constants/registeration";

export const verifyEmail = async (e:Context<{Bindings:Bindings}>) => {
    const db = drizzle(e.env.bucchinote_db);
    const formData = await e.req.formData();
    const submittedToken = formData.get("onetime_token");
    const sessionId = getCookie(e, REG_SESSION_COOKIE);
    const now = Math.floor(Date.now() / 1000);

    if (typeof sessionId !== "string") {
        return e.json({
            ok: false,
            error: "セッションが無効です。最初からやり直してください",
        });
    }

    const sessionResult = await db
        .select()
        .from(reg_sessions)
        .where(
            and(
                eq(reg_sessions.session_id, sessionId),
                eq(reg_sessions.stage, 0),
                gt(reg_sessions.expires_at, now)
            )
        )
        .limit(1);

    const session = sessionResult[0];

    if (!session || typeof submittedToken !== "string" || submittedToken.length !== TOKEN_DIGITS) {
        return e.json({ ok: false, error: "認証コードまたはセッションが無効です" });
    }

    if (submittedToken === session.onetime_token) {
        await db
            .update(reg_sessions)
            .set({ stage: 1, onetime_token: null })
            .where(eq(reg_sessions.session_id, sessionId));
        return e.json({ ok: true });
    }

    return e.json({ ok: false, error: "認証コードが一致しません" });
}