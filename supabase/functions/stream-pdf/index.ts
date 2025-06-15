
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
  
  console.log(`📋 Request received for document: ${documentId}`);
  
  if (!documentId) {
    console.error("❌ No document_id provided");
    return new Response(JSON.stringify({ error: "No document_id provided" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Log environment variables (without exposing full values)
  console.log(`🔧 Supabase URL configured: ${supabaseUrl ? "✅" : "❌"}`);
  console.log(`🔑 Supabase Key configured: ${supabaseAnonKey ? "✅" : "❌"}`);

  const bucket = "pdfs";
  const filePath = `${documentId}.pdf`;
  
  console.log(`📁 Attempting to fetch: ${bucket}/${filePath}`);

  try {
    // Construct the storage URL
    const storageUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${filePath}`;
    console.log(`🌐 Storage URL: ${storageUrl}`);

    // Fetch the file from Supabase Storage
    const fileResp = await fetch(storageUrl, {
      headers: {
        authorization: `Bearer ${supabaseAnonKey}`,
        apikey: supabaseAnonKey,
      },
    });

    console.log(`📊 Storage response status: ${fileResp.status}`);
    console.log(`📊 Storage response headers:`, Object.fromEntries(fileResp.headers.entries()));

    if (!fileResp.ok) {
      const errorText = await fileResp.text();
      console.error(`❌ Storage error ${fileResp.status}:`, errorText);
      
      let errorMessage = "File not found";
      if (fileResp.status === 404) {
        errorMessage = `PDF file not found in storage: ${filePath}`;
      } else if (fileResp.status === 403) {
        errorMessage = "Access denied to storage bucket";
      } else {
        errorMessage = `Storage error ${fileResp.status}: ${errorText}`;
      }
      
      return new Response(JSON.stringify({ 
        error: errorMessage,
        details: { status: fileResp.status, response: errorText }
      }), {
        status: fileResp.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check content type and size
    const contentType = fileResp.headers.get("Content-Type");
    const contentLength = fileResp.headers.get("Content-Length");
    
    console.log(`📄 File Content-Type: ${contentType}`);
    console.log(`📏 File Content-Length: ${contentLength}`);

    // Validate that we're getting a PDF
    if (contentType && !contentType.includes("application/pdf") && !contentType.includes("application/octet-stream")) {
      console.warn(`⚠️ Unexpected content type: ${contentType}`);
    }

    // Check if file is too small (likely corrupted)
    if (contentLength && parseInt(contentLength) < 100) {
      console.warn(`⚠️ File seems too small: ${contentLength} bytes`);
    }

    // Set headers for PDF response
    const responseHeaders = {
      ...corsHeaders,
      "Content-Type": contentType || "application/pdf",
      "Content-Disposition": "inline",
      "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    };

    // Add content length if available
    if (contentLength) {
      responseHeaders["Content-Length"] = contentLength;
    }

    console.log(`✅ Successfully serving PDF: ${documentId}.pdf (${contentLength || 'unknown'} bytes)`);

    // Return the streamed body
    return new Response(fileResp.body, {
      status: 200,
      headers: responseHeaders,
    });

  } catch (error) {
    console.error(`💥 Unexpected error:`, error);
    
    return new Response(JSON.stringify({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
