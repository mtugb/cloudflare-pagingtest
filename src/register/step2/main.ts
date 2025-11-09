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
            const res = await fetch("/api/verifyEmail", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();
            const parsed = schema.parse(data); // Zodでバリデーション

            // 成功なら次のステップへ
            window.location.href = "/register/step3/index.html";
        } catch (err) {
            // ZodErrorやfetch失敗時の処理
            console.error("登録エラー:", err);
        }
    };

}