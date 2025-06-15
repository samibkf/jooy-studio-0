
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

serve(async (req) => {
  console.log(`\n--- New PDF Request: ${new Date().toISOString()} ---`);
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    console.log(" responding to OPTIONS request");
    return new Response(null, { headers: corsHeaders });
  }

  const { searchParams } = new URL(req.url);
  const documentId = searchParams.get("document_id");
  const userId = searchParams.get("user_id");
  
  console.log(`[STREAM-PDF] Request received for document: ${documentId}, user: ${userId}`);
  
  if (!documentId) {
    console.error("[STREAM-PDF] ❌ No document_id provided");
    return new Response(JSON.stringify({ error: "No document_id provided" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Log environment variables (without exposing full values)
  console.log(`[STREAM-PDF] 🔧 Supabase URL configured: ${supabaseUrl ? "✅" : "❌"}`);
  console.log(`[STREAM-PDF] 🔑 Supabase Key configured: ${supabaseAnonKey ? "✅" : "❌"}`);

  const bucket = "pdfs";
  
  // Try both storage patterns: flat and user-specific
  const filePaths = [
    `${documentId}.pdf`, // Flat storage pattern
    userId ? `${userId}/${documentId}.pdf` : null // User-specific pattern
  ].filter(Boolean);
  
  console.log(`[STREAM-PDF] 📁 Will try these paths:`, filePaths);

  for (const filePath of filePaths) {
    try {
      console.log(`[STREAM-PDF] 🔍 Attempting to fetch: ${bucket}/${filePath}`);
      
      // Construct the storage URL
      const storageUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${filePath}`;
      console.log(`[STREAM-PDF] 🌐 Storage URL: ${storageUrl}`);

      // Fetch the file from Supabase Storage
      const fileResp = await fetch(storageUrl, {
        headers: {
          authorization: `Bearer ${supabaseAnonKey}`,
          apikey: supabaseAnonKey,
        },
      });

      console.log(`[STREAM-PDF] 📊 Storage response status for ${filePath}: ${fileResp.status}`);

      if (fileResp.ok) {
        // Check content type and size
        const contentType = fileResp.headers.get("Content-Type");
        const contentLength = fileResp.headers.get("Content-Length");
        
        console.log(`[STREAM-PDF] 📄 File Content-Type: ${contentType}`);
        console.log(`[STREAM-PDF] 📏 File Content-Length: ${contentLength}`);

        // Validate that we're getting a PDF
        if (contentType && !contentType.includes("application/pdf") && !contentType.includes("application/octet-stream")) {
          console.warn(`[STREAM-PDF] ⚠️ Unexpected content type: ${contentType}`);
        }

        // Check if file is too small (likely corrupted)
        if (contentLength && parseInt(contentLength) < 100) {
          console.warn(`[STREAM-PDF] ⚠️ File seems too small: ${contentLength} bytes`);
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

        console.log(`[STREAM-PDF] ✅ Successfully serving PDF from path: ${filePath} (${contentLength || 'unknown'} bytes)`);

        // Return the streamed body
        return new Response(fileResp.body, {
          status: 200,
          headers: responseHeaders,
        });
      } else {
        console.log(`[STREAM-PDF] ❌ Failed to fetch from ${filePath}: ${fileResp.status}`);
        
        // If it's not a 404, log the error but continue trying other paths
        if (fileResp.status !== 404) {
          const errorText = await fileResp.text();
          console.error(`[STREAM-PDF] ❌ Non-404 error for ${filePath}:`, errorText.substring(0, 500));
        }
      }

    } catch (error) {
      console.error(`[STREAM-PDF] 💥 Error fetching from ${filePath}:`, error);
      // Continue to next path
    }
  }

  // If we get here, no path worked
  console.error(`[STREAM-PDF] ❌ PDF not found in any of the attempted paths:`, filePaths);
  
  return new Response(JSON.stringify({ 
    error: `PDF file not found after trying all paths.`,
    details: { 
      documentId,
      userId,
      attemptedPaths: filePaths,
      message: "The PDF was not found in storage. Check if the file exists at one of the attempted paths and that the Edge Function has permission to read it."
    }
  }), {
    status: 404,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
