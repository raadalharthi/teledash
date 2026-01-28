// Cloudflare Email Worker - FREE email receiving
// Deploy this to Cloudflare Workers to receive emails for free

export default {
  async email(message, env, ctx) {
    // Extract email data
    const from = message.from;
    const to = message.to;
    const subject = message.headers.get("subject") || "(No Subject)";

    // Read the email body
    const reader = message.raw.getReader();
    const chunks = [];
    let done = false;

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      if (value) chunks.push(value);
      done = readerDone;
    }

    const rawEmail = new TextDecoder().decode(
      new Uint8Array(chunks.reduce((acc, chunk) => [...acc, ...chunk], []))
    );

    // Extract plain text body (simple extraction)
    let bodyText = "";
    const textMatch = rawEmail.match(/\r\n\r\n([\s\S]*?)(?=\r\n--|\r\n\.\r\n|$)/);
    if (textMatch) {
      bodyText = textMatch[1].trim();
    }

    // Parse sender name and email
    const fromMatch = from.match(/^(?:(.+?)\s*<)?([^<>]+)>?$/);
    const fromName = fromMatch?.[1]?.trim() || "";
    const fromEmail = fromMatch?.[2]?.trim() || from;

    // Send to your Supabase Edge Function
    const webhookUrl = "https://qkkfvbbuyjqlsygyogwx.supabase.co/functions/v1/email-webhook";

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from_email: fromEmail,
          from_name: fromName,
          to_email: to,
          subject: subject,
          body_text: bodyText || "Email received (body parsing in progress)",
        }),
      });

      console.log("Webhook response:", await response.text());
    } catch (error) {
      console.error("Failed to send to webhook:", error);
    }
  },
};
