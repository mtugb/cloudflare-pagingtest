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
        const errorArea = document.getElementById("error") as HTMLElement;

        try {
            const res = await fetch("/api/registerEmail", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();
            const parsed = schema.parse(data); // Zodでバリデーション
            if (!parsed.ok) {
                errorArea.textContent = parsed.error ?? '';
                return;
            }

            // 成功なら次のステップへ
            window.location.href = "/register/step2/index.html";
        } catch (err) {
            // ZodErrorやfetch失敗時の処理
            console.error("登録エラー:", err);
        }
    };

}