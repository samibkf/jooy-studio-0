
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

serve(async (req) => {
  console.log(`\n--- New Encrypted Worksheet Request: ${new Date().toISOString()} ---`);
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    console.log("Responding to OPTIONS request");
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    console.log("Method not allowed:", req.method);
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { worksheetId } = await req.json();
    
    console.log(`[GET-ENCRYPTED-WORKSHEET] Request for worksheet: ${worksheetId}`);
    
    if (!worksheetId) {
      console.error("[GET-ENCRYPTED-WORKSHEET] ❌ No worksheetId provided");
      return new Response(JSON.stringify({ error: "worksheetId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client for database and storage access
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    console.log(`[GET-ENCRYPTED-WORKSHEET] 🔍 Looking up document owner for: ${worksheetId}`);

    // Step A: Find the owner of the document
    const { data: doc, error: docError } = await supabaseAdmin
      .from('documents')
      .select('user_id, name')
      .eq('id', worksheetId)
      .single();

    if (docError || !doc || !doc.user_id) {
      console.error(`[GET-ENCRYPTED-WORKSHEET] ❌ Document not found for worksheetId: ${worksheetId}`, docError);
      return new Response(JSON.stringify({ error: "Document not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ownerId = doc.user_id;
    console.log(`[GET-ENCRYPTED-WORKSHEET] 📋 Document "${doc.name}" owned by user: ${ownerId}`);

    // Step B: Try to fetch the file from storage (with fallback logic)
    const bucket = "pdfs";
    const filePaths = [
      `${ownerId}/${worksheetId}.pdf`, // User-specific pattern
      `${worksheetId}.pdf` // Flat storage pattern for backward compatibility
    ];

    console.log(`[GET-ENCRYPTED-WORKSHEET] 📁 Will try these paths:`, filePaths);

    let file = null;
    let successfulPath = null;

    for (const filePath of filePaths) {
      try {
        console.log(`[GET-ENCRYPTED-WORKSHEET] 🔍 Attempting to download: ${bucket}/${filePath}`);
        
        const { data: fileData, error: fileError } = await supabaseAdmin.storage
          .from(bucket)
          .download(filePath);

        if (fileError) {
          console.log(`[GET-ENCRYPTED-WORKSHEET] ❌ Failed to download from ${filePath}: ${fileError.message}`);
          continue;
        }

        if (fileData) {
          file = fileData;
          successfulPath = filePath;
          console.log(`[GET-ENCRYPTED-WORKSHEET] ✅ Successfully downloaded from: ${filePath}`);
          break;
        }
      } catch (error) {
        console.error(`[GET-ENCRYPTED-WORKSHEET] 💥 Error downloading from ${filePath}:`, error);
      }
    }

    if (!file || !successfulPath) {
      console.error(`[GET-ENCRYPTED-WORKSHEET] ❌ PDF not found in any of the attempted paths:`, filePaths);
      return new Response(JSON.stringify({ 
        error: "PDF file not found",
        details: {
          worksheetId,
          ownerId,
          attemptedPaths: filePaths
        }
      }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step C: Encrypt the file
    console.log(`[GET-ENCRYPTED-WORKSHEET] 🔐 Starting encryption process...`);
    
    const encryptionKey = Deno.env.get("PDF_ENCRYPTION_KEY");
    if (!encryptionKey) {
      console.error("[GET-ENCRYPTED-WORKSHEET] ❌ PDF_ENCRYPTION_KEY is not set in Supabase secrets");
      throw new Error("PDF_ENCRYPTION_KEY is not configured");
    }

    console.log(`[GET-ENCRYPTED-WORKSHEET] 🔑 Encryption key configured, proceeding with encryption...`);

    // Import the encryption key
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(encryptionKey),
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );

    // Generate a random IV
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Convert file to ArrayBuffer and encrypt
    const fileBuffer = await file.arrayBuffer();
    console.log(`[GET-ENCRYPTED-WORKSHEET] 📊 File size: ${fileBuffer.byteLength} bytes`);
    
    const encryptedContent = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      fileBuffer
    );

    console.log(`[GET-ENCRYPTED-WORKSHEET] 🔐 Encryption completed. Encrypted size: ${encryptedContent.byteLength} bytes`);

    // Prepare the response payload
    const responsePayload = {
      encryptedPdf: arrayBufferToBase64(encryptedContent),
      iv: arrayBufferToBase64(iv),
      originalSize: fileBuffer.byteLength,
      worksheetId: worksheetId,
      success: true
    };

    console.log(`[GET-ENCRYPTED-WORKSHEET] ✅ Successfully processed worksheet: ${worksheetId}, original size: ${fileBuffer.byteLength} bytes`);

    return new Response(JSON.stringify(responsePayload), {
      headers: { 
        ...corsHeaders, 
        "Content-Type": "application/json",
        "Cache-Control": "private, max-age=300" // Cache for 5 minutes
      },
    });

  } catch (err) {
    console.error("[GET-ENCRYPTED-WORKSHEET] 💥 Unexpected error:", err);
    return new Response(JSON.stringify({ 
      error: err?.message || "An unexpected error occurred",
      worksheetId: null,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
