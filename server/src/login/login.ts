import { drizzle } from "drizzle-orm/d1";
import { Context } from "hono";
import { Bindings } from "../../types/Binding";
import { users } from "../../../schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { sign } from "hono/jwt";
import { JWT_TOKEN_COOKIE, LONG_TERM_JWT_TOKEN_COOKIE } from "../../constants/registeration"; 
import { setCookie } from "hono/cookie";
const GENERIC_LOGIN_ERROR = "メールアドレスまたはパスワードが間違っています"; // 統一エラーメッセージ

export const login = async (e: Context<{ Bindings: Bindings }>) => {
    const db = drizzle(e.env.bucchinote_db);
    const formData = await e.req.formData();
    const email = formData.get("email");
    const password = formData.get("password");

    // 入力値の基本的なチェック
    if (typeof email !== "string" || !/\S+@\S+\.\S+/.test(email)) {
        return e.json({ ok: false, error: "メールアドレスが不正です" });
    }

    if (typeof password !== 'string') {
        return e.json({ ok: false, error: "パスワードが不正です" });
    }

    const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

    // ユーザー列挙攻撃を防ぐため、未登録でも一般的なエラーメッセージを返す
    if (existingUser.length === 0) {
        // ダミーのbcrypt比較などで時間差をなくす工夫をすることもありますが、今回は簡略化
        return e.json({ ok: false, error: GENERIC_LOGIN_ERROR });
    }

    const now = Math.floor(Date.now() / 1000);
    const LONG_TERM_JWT_TOKEN_EXPIRY_SECONDS = 7 * 24 * 60 * 60;//a week
    const JWT_TOKEN_EXPIRY_SECONDS = 60 * 5;//5 minutes

    try {
        const isAuthenticated = await bcrypt.compare(password, existingUser[0].password_hash);
        
        // パスワード不一致の場合も、一般的なエラーメッセージを返す
        if (!isAuthenticated) {
            return e.json({ ok: false, error: GENERIC_LOGIN_ERROR });
        }
        
        // アクセストークン (短期) とリフレッシュトークン (長期) のペイロード
        const long_term_payload = {
            // リフレッシュトークンにはユーザーを特定できるIDのみを含めるのが一般的
            userId: existingUser[0].id,
            exp: now + LONG_TERM_JWT_TOKEN_EXPIRY_SECONDS
        }
        const payload = {
            // アクセストークンにはAPIアクセスに必要な情報を追加
            userId: existingUser[0].id,
            name: existingUser[0].name,
            email: existingUser[0].email,
            exp: now + JWT_TOKEN_EXPIRY_SECONDS
        }
        
        const jwt_secret = e.env.JWT_SECRET;
        if (!jwt_secret) {
            console.error("環境変数JWT_SECRETが見つかりません");
            return e.json({ ok: false, error: "サーバーエラー" });
        }
        
        const long_term_token = await sign(long_term_payload, jwt_secret) // リフレッシュトークン
        const token = await sign(payload, jwt_secret) // アクセストークン

        // 1. リフレッシュトークン (長期) を別のクッキー名で設定
        setCookie(e, LONG_TERM_JWT_TOKEN_COOKIE, long_term_token, {
            httpOnly: true,
            secure: true,
            sameSite: "Lax",
            maxAge: LONG_TERM_JWT_TOKEN_EXPIRY_SECONDS,
            path: "/",
        });

        // 2. アクセストークン (短期) を元のクッキー名で設定
        setCookie(e, JWT_TOKEN_COOKIE, token, {
            httpOnly: true,
            secure: true,
            sameSite: "Lax",
            maxAge: JWT_TOKEN_EXPIRY_SECONDS,
            path: "/",
        });

        return e.json({ ok: true });
    } catch (err) {
        console.error("ログインエラー:", err);
        return e.json({ ok: false, error: "サーバーエラーが発生しました" });
    }
}