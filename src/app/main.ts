import { checkAuthSchema } from "../../common/types/checkAuth";

window.onload = async () => {
    checkAuth();
}

// クライアントサイドの認証チェック関数 (例: src/app/main.ts 内)
async function checkAuth() {
    try {
        const res = await fetch("/api/auth/check", {
            method: "GET"
        });
        const data = await res.json();
        const parsed = checkAuthSchema.parse(data);

        if (parsed.ok) {
            // 認証成功 (アプリの初期化処理へ)
            return;
        }

        // 認証失敗時: リダイレクト先があれば遷移。なければデフォルトで /login へ。
        if (parsed.redirectTo) {
            window.location.href = parsed.redirectTo;
            return;
        }

        // ok: false だが redirectTo がない場合 (予期せぬ認証エラー)
        console.error("Authentication failed without redirect target:", parsed.error);
        window.location.href = "/login/index.html"; // 安全のためデフォルトのフォールバック

    } catch (err) {
        // 💡 ネットワークエラー、JSON解析エラー、Zod検証エラーなど、すべてを捕捉
        console.error("Failed to communicate with auth checker (Network/Parse Error):", err);
        window.location.href = "/login/index.html"; // 安全のためログイン画面へ誘導
    }
}