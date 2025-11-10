import { Context } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { sign, verify } from "hono/jwt";
import { getCookie, setCookie } from "hono/cookie";

// 外部ファイルからの型定義と定数
import { Bindings } from "../../types/Binding";
import { Variables } from "../../types/Variables";
import { JWT_TOKEN_COOKIE, LONG_TERM_JWT_TOKEN_COOKIE } from "../../constants/registeration";
import { users } from "../../../schema";
import { CheckAuthResponse } from "../../../common/types/checkAuth"; // 💡 クライアント/サーバー間で共有される型

// JWTペイロードの型定義 (loginでsignしたものと一致させる)
type JwtPayload = {
    userId: string;
    name?: string;
    email?: string;
    exp: number;
};

// 認証チェックAPIハンドラ
export const checkAuth = async (e: Context<{ Bindings: Bindings, Variables: Variables }>) => {
    const db = drizzle(e.env.bucchinote_db);
    const jwtSecret = e.env.JWT_SECRET;

    if (!jwtSecret) {
        console.error('環境変数JWT_SECRETが見つかりません');
        // サーバー設定エラーとして500を返す
        return e.json({ ok: false, error: 'サーバー設定エラー' } satisfies CheckAuthResponse, 500);
    }

    let token = getCookie(e, JWT_TOKEN_COOKIE);

    // 1. アクセストークン（短期）が存在する場合、検証を行う
    if (token) {
        try {
            const payload = await verify(token, jwtSecret) as JwtPayload;
            
            // 認証成功: JSONを返して終了
            return e.json({ ok: true } satisfies CheckAuthResponse);
            
        } catch (error) {
            // トークンが無効または期限切れ
            console.log("アクセストークン検証失敗。リフレッシュを試行します。");
            token = undefined;
        }
    }

    // 2. アクセストークンがない/無効な場合、リフレッシュトークン（長期）をチェック
    const long_term_token = getCookie(e, LONG_TERM_JWT_TOKEN_COOKIE);

    if (!long_term_token) {
        // リフレッシュトークンもなければログインが必要
        e.status(401);
        return e.json({ ok: false, error: '認証情報がありません', redirectTo: "/login/index.html" } satisfies CheckAuthResponse);
    }

    try {
        // 3. リフレッシュトークンの検証とペイロード取得
        const long_term_payload = await verify(long_term_token, jwtSecret) as JwtPayload;

        // 4. DBからユーザー情報を取得
        const existingUser = await db
            .select()
            .from(users)
            .where(eq(users.id, Number(long_term_payload.userId)))
            .limit(1);

        if (existingUser.length === 0) {
            // ユーザーが存在しない
            e.status(401);
            return e.json({ ok: false, error: 'ユーザー情報が見つかりません', redirectTo: "/login/index.html" } satisfies CheckAuthResponse);
        }

        // 5. 新しいアクセストークンの発行
        const now = Math.floor(Date.now() / 1000);
        const JWT_TOKEN_EXPIRY_SECONDS = 60 * 5; // 5 minutes

        const payload = {
            userId: existingUser[0].id,
            name: existingUser[0].name,
            email: existingUser[0].email,
            exp: now + JWT_TOKEN_EXPIRY_SECONDS
        }
        const newToken = await sign(payload, jwtSecret);

        // 6. 新しいアクセストークンをクッキーに設定
        setCookie(e, JWT_TOKEN_COOKIE, newToken, {
            httpOnly: true,
            secure: true,
            sameSite: "Lax",
            maxAge: JWT_TOKEN_EXPIRY_SECONDS,
            path: "/",
        });
        
        // 7. 認証成功レスポンス: リフレッシュ成功
        return e.json({ ok: true } satisfies CheckAuthResponse); 

    } catch (err) {
        // リフレッシュトークンの検証失敗（期限切れ、改ざんなど）
        console.error("リフレッシュトークン検証エラー:", err);
        e.status(401);
        return e.json({ ok: false, error: '認証情報が無効です', redirectTo: "/login/index.html" } satisfies CheckAuthResponse);
    }
};