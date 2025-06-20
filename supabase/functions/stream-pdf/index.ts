
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, cache-control, x-encryption-key, x-encryption-iv",
  "Access-Control-Expose-Headers": "x-encryption-key, x-encryption-iv",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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
      
      // Generate signed URL for the private file
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

      // Fetch the file using the signed URL
      const fileResp = await fetch(signedUrlData.signedUrl);

      console.log(`[STREAM-PDF] 📊 File response status for ${filePath}: ${fileResp.status}`);

      if (fileResp.ok) {
        const arrayBuffer = await fileResp.arrayBuffer();
        console.log(`[STREAM-PDF] encrypting file: ${arrayBuffer.byteLength} bytes`);

        // 1. Generate AES-GCM key and IV
        const key = await crypto.subtle.generateKey(
          { name: "AES-GCM", length: 256 },
          true,
          ["encrypt", "decrypt"]
        );
        const iv = crypto.getRandomValues(new Uint8Array(12));

        // 2. Encrypt the PDF data
        const encryptedData = await crypto.subtle.encrypt(
          { name: "AES-GCM", iv: iv },
          key,
          arrayBuffer
        );

        // 3. Export the key to be sent in headers
        const exportedKey = await crypto.subtle.exportKey("raw", key);

        // 4. Base64 encode key and IV for headers
        const keyB64 = encode(exportedKey);
        const ivB64 = encode(iv);
        
        const responseHeaders = {
          ...corsHeaders,
          "Content-Type": "application/octet-stream", // Disguise content type
          "X-Encryption-Key": keyB64,
          "X-Encryption-IV": ivB64,
          "Content-Length": encryptedData.byteLength.toString(),
          "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet",
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        };

        console.log(`[STREAM-PDF] ✅ Successfully encrypting and serving PDF from path: ${filePath}`);

        return new Response(encryptedData, {
          status: 200,
          headers: responseHeaders,
        });

      } else {
        console.log(`[STREAM-PDF] ❌ Failed to fetch from signed URL for ${filePath}: ${fileResp.status}`);
        
        if (fileResp.status !== 404) {
          const errorText = await fileResp.text();
          console.error(`[STREAM-PDF] ❌ Non-404 error for ${filePath}:`, errorText.substring(0, 500));
        }
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
