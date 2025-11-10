import { boolean } from "drizzle-orm/gel-core";
import z from "zod";

export const schema = z.object({
    ok: z.boolean('not boolean'),
    error: z.string('not string').optional()
})

window.onload = () => {
    const form = document.getElementById("registerForm") as HTMLFormElement;

    form.onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(form);

        try {
            // 🌟 修正: APIエンドポイントを /api/registerUserdata に修正
            const res = await fetch("/api/registerUserdata", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();
            const parsed = schema.parse(data); // Zodでバリデーション

            if (parsed.ok) {
                 // 成功なら次のステップへ (登録完了画面)
                window.location.href = "/register/complete/index.html";
            } else {
                // 🌟 追加: エラー表示
                console.error("登録エラー:", parsed.error || "登録に失敗しました");
                alert(parsed.error || "登録に失敗しました"); 
            }
        } catch (err) {
            // ZodErrorやfetch失敗時の処理
            console.error("通信エラー:", err);
            alert("通信エラーが発生しました。");
        }
    };
}