// Supabase Edge Function: Email Webhook
// Receives emails from SendGrid/Mailgun and stores them in Supabase

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse the incoming webhook
    const contentType = req.headers.get("content-type") || "";
    let emailData: {
      from_email: string;
      from_name: string;
      to_email: string;
      subject: string;
      body_text: string;
      body_html?: string;
    };

    if (contentType.includes("application/json")) {
      // JSON payload (some providers)
      const body = await req.json();
      emailData = parseJsonPayload(body);
    } else if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
      // Form data (SendGrid Inbound Parse)
      const formData = await req.formData();
      emailData = parseFormDataPayload(formData);
    } else {
      // Try to parse as JSON anyway
      const text = await req.text();
      try {
        const body = JSON.parse(text);
        emailData = parseJsonPayload(body);
      } catch {
        throw new Error(`Unsupported content type: ${contentType}`);
      }
    }

    console.log("Received email:", {
      from: emailData.from_email,
      to: emailData.to_email,
      subject: emailData.subject,
    });

    // Call the database function to process the email
    const { data, error } = await supabase.rpc("process_incoming_email", {
      p_from_email: emailData.from_email,
      p_from_name: emailData.from_name,
      p_to_email: emailData.to_email,
      p_subject: emailData.subject,
      p_body_text: emailData.body_text,
      p_body_html: emailData.body_html,
    });

    if (error) {
      console.error("Database error:", error);
      throw error;
    }

    console.log("Email processed:", data);

    return new Response(
      JSON.stringify({ success: true, data }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error processing email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

// Parse SendGrid Inbound Parse format (form data)
function parseFormDataPayload(formData: FormData) {
  const from = formData.get("from") as string || "";
  const to = formData.get("to") as string || "";
  const subject = formData.get("subject") as string || "(No Subject)";
  const text = formData.get("text") as string || "";
  const html = formData.get("html") as string || "";

  // Parse "from" field: "Name <email@example.com>" or just "email@example.com"
  const fromMatch = from.match(/^(?:(.+?)\s*<)?([^<>]+)>?$/);
  const fromName = fromMatch?.[1]?.trim() || "";
  const fromEmail = fromMatch?.[2]?.trim() || from;

  // Parse "to" field similarly
  const toMatch = to.match(/^(?:(.+?)\s*<)?([^<>]+)>?$/);
  const toEmail = toMatch?.[2]?.trim() || to;

  return {
    from_email: fromEmail,
    from_name: fromName,
    to_email: toEmail,
    subject: subject,
    body_text: text,
    body_html: html || undefined,
  };
}

// Parse JSON payload (Mailgun, etc.)
function parseJsonPayload(body: any) {
  // Handle different JSON formats from various providers

  // Mailgun format
  if (body.sender || body["from"]) {
    return {
      from_email: body.sender || body["from"] || "",
      from_name: body["from-name"] || "",
      to_email: body.recipient || body["to"] || "",
      subject: body.subject || "(No Subject)",
      body_text: body["body-plain"] || body.text || body.body || "",
      body_html: body["body-html"] || body.html || undefined,
    };
  }

  // Generic format
  return {
    from_email: body.from_email || body.from || body.sender || "",
    from_name: body.from_name || "",
    to_email: body.to_email || body.to || body.recipient || "",
    subject: body.subject || "(No Subject)",
    body_text: body.body_text || body.text || body.body || "",
    body_html: body.body_html || body.html || undefined,
  };
}
