
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  // Optionally restrict Methods to only GET if you want
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const { searchParams } = new URL(req.url);
  const documentId = searchParams.get("document_id");
  if (!documentId) {
    return new Response(JSON.stringify({ error: "No document_id provided" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // You should optionally make sure the user is authenticated here for advanced use

  // Here you must determine the bucket and the file path of the PDF based on the document_id.
  // For demonstration, let's assume all PDFs are in a 'pdfs' bucket and named "{document_id}.pdf"
  const bucket = "pdfs";
  const filePath = `${documentId}.pdf`;

  // Stream the PDF file from Supabase Storage
  const storageUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${filePath}`;

  const fileResp = await fetch(storageUrl, {
    headers: {
      authorization: `Bearer ${supabaseAnonKey}`,
      apikey: supabaseAnonKey,
    },
  });

  if (!fileResp.ok) {
    return new Response(JSON.stringify({ error: "File not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Set headers to *discourage* downloaders: do NOT set Content-Disposition: attachment
  const forbidDownloadHeaders = {
    ...corsHeaders,
    "Content-Type": fileResp.headers.get("Content-Type") || "application/pdf",
    // Hide file-type to some downloaders, optionally use application/octet-stream
    "Content-Disposition": "inline", // Not "attachment"
    "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet",
    // Deny in-client sniffing (optional, but could affect compatibility)
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
  };

  // Return the streamed body as-is
  return new Response(fileResp.body, {
    status: 200,
    headers: forbidDownloadHeaders,
  });
});
