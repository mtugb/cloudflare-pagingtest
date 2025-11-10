import { AwsClient } from "aws4fetch";
import { Bindings } from "../types/Binding";

export async function sendSesEmail(
    env: Bindings,
    to: string,
    subject: string,
    textBody: string,
    source: string
) {
    // SES Classic (Query API)
    const endpoint = `https://email.${env.AWS_REGION}.amazonaws.com/`;

    const aws = new AwsClient({
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
        service: "ses",
        region: env.AWS_REGION,
    });

    const params = new URLSearchParams({
        Action: "SendEmail",
        Version: "2010-12-01",
        Source: source,
        "Destination.ToAddresses.member.1": to,
        "Message.Subject.Data": subject,
        "Message.Subject.Charset": "UTF-8",
        "Message.Body.Text.Data": textBody,
        "Message.Body.Text.Charset": "UTF-8",
    });

    const res = await aws.fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
    });

    if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`SES SendEmail failed: ${res.status} ${res.statusText} ${body}`);
    }
}