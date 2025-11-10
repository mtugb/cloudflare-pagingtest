import z from "zod";

export const checkAuthSchema = z.object({
    ok: z.boolean(),
    error: z.string().optional(),
    redirectTo: z.string().optional()
})

export type CheckAuthResponse = z.infer<typeof checkAuthSchema>