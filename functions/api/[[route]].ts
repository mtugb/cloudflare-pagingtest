import { SendEmailCommand, SESClient } from "@aws-sdk/client-ses";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import { handle } from "hono/cloudflare-pages";
import { users } from "../../schema";
import bcrypt from "bcryptjs";
import { getCookie, setCookie } from "hono/cookie";
import { eq } from "drizzle-orm";

interface Bindings {
    bucchinote_db: D1Database
}

const FIVE_MIN = 60 * 5;
const FIVE_MIN_LATER = Math.floor(Date.now() / 1000) + FIVE_MIN;

const app = new Hono();
const api = new Hono<{ Bindings: Bindings }>();

api.post('/registerEmail', async (e) => {
    const formData = await e.req.formData();
    const email = formData.get("email");

    if (typeof email !== "string") {
        return e.json({ ok: false, error: "メールが不正です" });
    }

    const ses = new SESClient({
        region: process.env.AWS_REGION,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
        }
    })

    const onetimeToken = Math.floor(Math.random() * 9000) + 1000;

    await ses.send(new SendEmailCommand({
        Source: "info@example.com",
        Destination: { ToAddresses: [email] },
        Message: {
            Subject: { Data: "【BucchiNote】メールアドレスの認証コード" },
            Body: { Text: { Data: `メールアドレスの認証コードは ${onetimeToken} です。` } },
        }
    }))

    setCookie(e, 'onetime_token', onetimeToken.toString(), {
        httpOnly: true,
        secure: true,
        maxAge: FIVE_MIN,
        path: '/',
    })
    
    setCookie(e, 'onetime_email', email, {
        httpOnly: true,
        secure: true,
        maxAge: FIVE_MIN,
        path: '/',
    })

    return e.json({ ok: true });
});

api.post('/registerUserdata', async (e) => {
    const db = drizzle(e.env.bucchinote_db);
    const formData = await e.req.formData();
    const name = formData.get("first_name");
    const password = formData.get("password");
    const email = getCookie(e, 'onetime_email');

    if (typeof name !== "string" || typeof email !== "string") {
        return e.json({ ok: false, error: "名前またはメールが不正です" });
    }

    if (typeof password !== "string" || password.length < 8) {
        return e.json({ ok: false, error: "パスワードが短すぎます" });
    }

    const hashedPassword = await bcrypt.hash(password, 10); // 10はsaltラウンド数

    await db.insert(users).values({
        name,
        email,
        password_hash: hashedPassword,
    });

    const ses = new SESClient({
        region: process.env.AWS_REGION,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
        }
    })

    const onetimeToken = Math.floor(Math.random() * 9000) + 1000;

    await ses.send(new SendEmailCommand({
        Source: "info@example.com",
        Destination: { ToAddresses: [email] },
        Message: {
            Subject: { Data: "【BucchiNote】メールアドレスの認証コード" },
            Body: { Text: { Data: `メールアドレスの認証コードは ${onetimeToken} です。` } },
        }
    }))

    return e.json({ ok: true });
});

api.post('/verifyEmail', async e => {
  const db = drizzle(e.env.bucchinote_db);
  const formData = await e.req.formData();
  const onetimeToken = formData.get("onetime_token");
  const genuineToken = getCookie(e, 'onetime_token');
  const email = getCookie(e, 'onetime_email');

  if (onetimeToken === genuineToken && typeof email === "string") {
    await db.update(users)
      .set({ verified: true })
      .where(eq(users.email, email));

    return e.json({ ok: true });
  }

  return e.json({ ok: false, error: "認証コードが一致しません" });
});


app.route('/api', api);

export const onRequest = handle(app);