import { drizzle } from "drizzle-orm/d1";
import { Context, Next } from "hono"; // Nextをインポート
import { eq } from "drizzle-orm";
import { sign, verify } from "hono/jwt"; // verifyをインポート
import { getCookie, setCookie } from "hono/cookie";
import { Bindings } from "./types/Binding";
import { JWT_TOKEN_COOKIE, LONG_TERM_JWT_TOKEN_COOKIE } from "./constants/registeration";
import { users } from "../schema";
import { Variables } from "./types/Variables";

// JWTペイロードの型定義 (long_term_tokenにname, emailを含める想定)
type JwtPayload = {
    userId: string;
    name?: string; // name, emailはリフレッシュトークンには不要だが、アクセストークン発行のために含めることも可
    email?: string; 
    exp: number; 
};

// /app ルート全体に適用する認証＆リフレッシュミドルウェア
export const appMiddleware = async (e: Context<{ Bindings: Bindings, Variables:Variables }>, next: Next) => {
    const db = drizzle(e.env.bucchinote_db);
    const jwtSecret = e.env.JWT_SECRET;

    if (!jwtSecret) {
        console.error('環境変数JWT_SECRETが見つかりません');
        return e.json({ ok: false, error: 'サーバー設定エラー' }, 500);
    }
    
    // 1. アクセストークン（短期）を取得
    let token = getCookie(e, JWT_TOKEN_COOKIE);

    // 2. アクセストークンが存在する場合、検証を行う
    if (token) {
        try {
            const payload = await verify(token, jwtSecret) as JwtPayload;
            // 認証成功: ペイロードをコンテキストにセットし、次のハンドラへ
            e.set('userId', Number(payload.userId));
            // 💡 認証が成功したらここで次の処理に進む
            await next();
            return; 
        } catch (error) {
            // トークンが無効または期限切れ
            console.log("アクセストークン検証失敗。リフレッシュを試行します。");
            // トークンが期限切れの場合、リフレッシュに進むため、token = null と扱う
            token = undefined; 
        }
    }
    
    // 3. アクセストークンが存在しない/無効な場合、リフレッシュトークンをチェック
    const long_term_token = getCookie(e, LONG_TERM_JWT_TOKEN_COOKIE);
    
    if (!long_term_token) {
        // リフレッシュトークンもなければログインが必要
        e.status(401);
        return e.redirect("/login"); 
    }

    try {
        // 4. リフレッシュトークンの検証とペイロード取得
        const long_term_payload = await verify(long_term_token, jwtSecret) as JwtPayload;
        
        // 5. DBからユーザー情報を取得 (※可能であればリフレッシュトークンに含めてDBアクセスを削減推奨)
        const existingUser = await db
            .select()
            .from(users)
            .where(eq(users.id, Number(long_term_payload.userId)))
            .limit(1);

        if (existingUser.length === 0) {
            // ユーザーが存在しない場合（セキュリティインシデントの可能性）
            e.status(401);
            return e.redirect("/login"); 
        }

        const now = Math.floor(Date.now() / 1000);
        const JWT_TOKEN_EXPIRY_SECONDS = 60 * 5; // 5 minutes

        // 6. 新しいアクセストークンの発行
        const payload = {
            userId: existingUser[0].id,
            name: existingUser[0].name,
            email: existingUser[0].email,
            exp: now + JWT_TOKEN_EXPIRY_SECONDS
        }
        const newToken = await sign(payload, jwtSecret);

        // 7. 新しいアクセストークンをクッキーに設定
        setCookie(e, JWT_TOKEN_COOKIE, newToken, {
            httpOnly: true,
            secure: true,
            sameSite: "Lax",
            maxAge: JWT_TOKEN_EXPIRY_SECONDS,
            path: "/",
        });

        // 8. 新しいトークンで認証が完了したとみなし、コンテキストに設定して次のハンドラへ
        e.set('userId', existingUser[0].id);
        await next();

    } catch (err) {
        // リフレッシュトークンの検証失敗（期限切れ、改ざんなど）
        console.error("リフレッシュトークン検証エラー:", err);
        // 不正なトークンは破棄し、ログイン画面へリダイレクト
        e.status(401);
        return e.redirect("/login"); 
    }
}