
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, range",
  "Accept-Ranges": "bytes",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  console.log(`\n--- New PDF Stream Request: ${new Date().toISOString()} ---`);
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    console.log("Responding to OPTIONS request");
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

  // Create admin client for private bucket access
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  console.log(`[STREAM-PDF] 🔧 Using admin client for private bucket access`);

  const bucket = "pdfs";
  
  // Try both storage patterns: user-specific and flat (for backward compatibility)
  const filePaths = [
    userId ? `${userId}/${documentId}.pdf` : null, // User-specific pattern
    `${documentId}.pdf` // Flat storage pattern for backward compatibility
  ].filter(Boolean);
  
  console.log(`[STREAM-PDF] 📁 Will try these paths:`, filePaths);

  for (const filePath of filePaths) {
    try {
      console.log(`[STREAM-PDF] 🔍 Attempting to access: ${bucket}/${filePath}`);
      
      // First, get file metadata to determine file size
      const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
        .from(bucket)
        .createSignedUrl(filePath, 300); // 5 minutes expiration

      if (signedUrlError) {
        console.log(`[STREAM-PDF] ❌ Failed to create signed URL for ${filePath}: ${signedUrlError.message}`);
        continue;
      }

      if (!signedUrlData?.signedUrl) {
        console.log(`[STREAM-PDF] ❌ No signed URL generated for ${filePath}`);
        continue;
      }

      console.log(`[STREAM-PDF] 🌐 Generated signed URL for: ${filePath}`);

      // Get file size with HEAD request
      const headResp = await fetch(signedUrlData.signedUrl, { method: "HEAD" });
      
      if (!headResp.ok) {
        console.log(`[STREAM-PDF] ❌ Failed to get file metadata for ${filePath}: ${headResp.status}`);
        continue;
      }

      const fileSize = parseInt(headResp.headers.get("content-length") || "0");
      
      if (fileSize === 0) {
        console.log(`[STREAM-PDF] ❌ Invalid file size for ${filePath}`);
        continue;
      }

      console.log(`[STREAM-PDF] 📊 File size: ${fileSize} bytes`);

      // Parse Range header
      const range = req.headers.get("range");
      let start = 0;
      let end = fileSize - 1;

      if (range) {
        console.log(`[STREAM-PDF] 📏 Range header received: ${range}`);
        const parts = range.replace(/bytes=/, "").split("-");
        start = parseInt(parts[0], 10);
        end = parts[1] ? parseInt(parts[1], 10) : end;
        
        // Validate range
        if (start >= fileSize || end >= fileSize || start > end) {
          console.error(`[STREAM-PDF] ❌ Invalid range: ${start}-${end} for file size ${fileSize}`);
          return new Response("Range Not Satisfiable", {
            status: 416,
            headers: {
              ...corsHeaders,
              "Content-Range": `bytes */${fileSize}`,
            },
          });
        }
      }

      const chunkSize = end - start + 1;
      console.log(`[STREAM-PDF] 📦 Serving chunk: ${start}-${end} (${chunkSize} bytes)`);

      // Fetch the requested range
      const rangeHeaders: Record<string, string> = {};
      if (range) {
        rangeHeaders["Range"] = `bytes=${start}-${end}`;
      }

      const fileResp = await fetch(signedUrlData.signedUrl, {
        headers: rangeHeaders,
      });

      if (!fileResp.ok) {
        console.log(`[STREAM-PDF] ❌ Failed to fetch range from ${filePath}: ${fileResp.status}`);
        continue;
      }

      const arrayBuffer = await fileResp.arrayBuffer();
      console.log(`[STREAM-PDF] ✅ Successfully serving PDF chunk from path: ${filePath}`);

      const responseHeaders = {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Length": arrayBuffer.byteLength.toString(),
        "Cache-Control": "public, max-age=3600",
        "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet",
      };

      // Add range-specific headers if this is a partial request
      if (range) {
        responseHeaders["Content-Range"] = `bytes ${start}-${end}/${fileSize}`;
        return new Response(arrayBuffer, {
          status: 206, // Partial Content
          headers: responseHeaders,
        });
      } else {
        return new Response(arrayBuffer, {
          status: 200,
          headers: responseHeaders,
        });
      }

    } catch (error) {
      console.error(`[STREAM-PDF] 💥 Error accessing ${filePath}:`, error);
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
      message: "The PDF was not found in storage. Check if the file exists at one of the attempted paths and that the Edge Function has admin permission to read it."
    }
  }), {
    status: 404,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
