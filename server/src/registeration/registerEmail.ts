import { Context } from "hono";
import { Bindings } from "../../types/Binding";
import { drizzle } from "drizzle-orm/d1";
import { reg_sessions, users } from "../../../schema";
import { REG_SESSION_COOKIE, REG_SESSION_EXPIRY_SECONDS } from "../../constants/registeration";
import { eq } from "drizzle-orm";
import { sendSesEmail } from "../../lib/sendSesEmail";
import { setCookie } from "hono/cookie";
import { generateToken } from "../../lib/generateToken";

export const registerEmail = async (e:Context<{Bindings:Bindings}>) => {
    const db = drizzle(e.env.bucchinote_db);
    const formData = await e.req.formData();
    const email = formData.get("email");
    const now = Math.floor(Date.now() / 1000);

    if (typeof email !== "string" || !/\S+@\S+\.\S+/.test(email)) {
        return e.json({ ok: false, error: "メールアドレスが不正です" });
    }

    // 既存ユーザーの重複チェック（大小文字差を避けるなら toLowerCase も推奨）
    const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
    if (existingUser.length > 0) {
        return e.json({ ok: false, error: "このメールアドレスは既に登録されています" });
    }

    // 古い一時セッションを削除
    await db.delete(reg_sessions).where(eq(reg_sessions.email, email)).execute();

    // セッション作成
    const onetimeToken = generateToken();
    const sessionId = crypto.randomUUID();
    const expiresAt = now + REG_SESSION_EXPIRY_SECONDS;

    try {
        await db
            .insert(reg_sessions)
            .values({
                session_id: sessionId,
                email: email,
                onetime_token: onetimeToken,
                expires_at: expiresAt,
                stage: 0, // メール認証待ち
            })
            .execute();

        // ★ ここが aws4fetch を使った SES 送信
        await sendSesEmail(
            e.env,
            email,
            "【BucchiNote】メールアドレスの認証コード",
            `メールアドレスの認証コードは ${onetimeToken} です。\nこのコードは30分間有効です。`,
            "BucchiNote <no-reply@bucchinote.com>" // 検証済みの送信元に置き換え
        );

        // ★ Cookie の path を '/' に（/api でも送られるように）
        setCookie(e, REG_SESSION_COOKIE, sessionId, {
            httpOnly: true,
            secure: true,
            sameSite: "Lax",
            maxAge: REG_SESSION_EXPIRY_SECONDS,
            path: "/", // ← '/register' から修正
        });

        return e.json({ ok: true });
    } catch (err) {
        console.error("登録セッション作成/メール送信エラー:", err);
        return e.json({ ok: false, error: "サーバーエラーが発生しました" });
    }
}