
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
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const { searchParams } = new URL(req.url);
  const documentId = searchParams.get("document_id");
  const userId = searchParams.get("user_id");
  
  console.log(`📋 Request received for document: ${documentId}, user: ${userId}`);
  
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
  
  // Try both storage patterns: flat and user-specific
  const filePaths = [
    `${documentId}.pdf`, // Flat storage pattern
    userId ? `${userId}/${documentId}.pdf` : null // User-specific pattern
  ].filter(Boolean);
  
  console.log(`📁 Will try these paths:`, filePaths);

  for (const filePath of filePaths) {
    try {
      console.log(`🔍 Attempting to fetch: ${bucket}/${filePath}`);
      
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

      console.log(`📊 Storage response status for ${filePath}: ${fileResp.status}`);

      if (fileResp.ok) {
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

        console.log(`✅ Successfully serving PDF from path: ${filePath} (${contentLength || 'unknown'} bytes)`);

        // Return the streamed body
        return new Response(fileResp.body, {
          status: 200,
          headers: responseHeaders,
        });
      } else {
        console.log(`❌ Failed to fetch from ${filePath}: ${fileResp.status}`);
        
        // If it's not a 404, log the error but continue trying other paths
        if (fileResp.status !== 404) {
          const errorText = await fileResp.text();
          console.error(`❌ Non-404 error for ${filePath}:`, errorText);
        }
      }

    } catch (error) {
      console.error(`💥 Error fetching from ${filePath}:`, error);
      // Continue to next path
    }
  }

  // If we get here, no path worked
  console.error(`❌ PDF not found in any of the attempted paths:`, filePaths);
  
  return new Response(JSON.stringify({ 
    error: `PDF file not found`,
    details: { 
      documentId,
      userId,
      attemptedPaths: filePaths,
      message: "The PDF was not found in storage. It may have been moved or deleted."
    }
  }), {
    status: 404,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
