
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function generateAudio(req: Request, supabaseAdmin: any) {
    const { tts_request_id } = await req.json();
    if (!tts_request_id) throw new Error("Missing tts_request_id");

    // 1. Update request status to 'processing'
    await supabaseAdmin
      .from("tts_requests")
      .update({ status: "processing", updated_at: new Date().toISOString() })
      .eq("id", tts_request_id);

    // 2. Fetch request details and document texts
    const { data: requestData, error: requestError } = await supabaseAdmin
      .from("tts_requests")
      .select("document_id, requested_pages")
      .eq("id", tts_request_id)
      .single();

    if (requestError) throw requestError;

    const { data: texts, error: textsError } = await supabaseAdmin
      .from("document_texts")
      .select("page, content")
      .eq("document_id", requestData.document_id)
      .in("page", requestData.requested_pages);

    if (textsError) throw textsError;

    if (!texts || texts.length === 0) {
        throw new Error("No text found for the requested pages.");
    }
    
    // 3. Generate audio for each page using Google Text-to-Speech REST API
    for (const text of texts) {
      const apiKey = Deno.env.get("GEMINI_API_KEY")!;
      const ttsResponse = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            input: { text: text.content },
            voice: { languageCode: 'en-US', name: 'en-US-Studio-O' },
            audioConfig: { audioEncoding: 'MP3' },
        }),
      });

      if (!ttsResponse.ok) {
        const errorBody = await ttsResponse.text();
        console.error(`Google TTS API error for page ${text.page}: ${ttsResponse.status} ${errorBody}`);
        throw new Error(`Google TTS API error: ${ttsResponse.status}`);
      }
      
      const responseData = await ttsResponse.json();
      const audioContent = responseData.audioContent;

      if (audioContent) {
        const binaryString = atob(audioContent);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        
        const filePath = `${tts_request_id}/${text.page}.mp3`;

        // Upload to storage
        const { error: uploadError } = await supabaseAdmin.storage
          .from("tts")
          .upload(filePath, bytes.buffer, {
            contentType: "audio/mpeg",
            upsert: true,
          });
        if (uploadError) throw uploadError;

        // Insert into tts_audio_files
        await supabaseAdmin.from("tts_audio_files").insert({
          tts_request_id,
          page_number: text.page,
          storage_path: filePath,
          file_size: bytes.length,
        });
      }
    }

    // 4. Update status to 'generated'
    await supabaseAdmin
      .from("tts_requests")
      .update({ status: "generated", updated_at: new Date().toISOString() })
      .eq("id", tts_request_id);
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseAdmin = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );
        
        // Run generation in background, don't await
        generateAudio(req, supabaseAdmin).catch(async (error) => {
            console.error("TTS Generation Error:", error);
            // Best effort to update status to failed
            try {
                const body = await req.clone().json();
                if(body.tts_request_id) {
                    await supabaseAdmin.from("tts_requests").update({ status: "failed" }).eq("id", body.tts_request_id);
                }
            } catch (e) {
                console.error("Failed to update status to failed:", e)
            }
        });
        
        return new Response(JSON.stringify({ message: "TTS Generation process started." }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 202,
        });

    } catch(error) {
        console.error("Main handler error:", error);
        return new Response(JSON.stringify({ error: "Internal Server Error" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        });
    }
});
