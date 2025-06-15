import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenAI } from "https://esm.sh/@google/genai@0.4.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

function createWavHeader(options: {
  numFrames: number;
  sampleRate: number;
  numChannels: number;
  bytesPerSample: number;
}) {
  const { numFrames, sampleRate, numChannels, bytesPerSample } = options;
  const dataSize = numFrames * numChannels * bytesPerSample;
  const buffer = new ArrayBuffer(44);
  const view = new DataView(buffer);

  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size for PCM
  view.setUint16(20, 1, true); // AudioFormat for PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true); // ByteRate
  view.setUint16(32, numChannels * bytesPerSample, true); // BlockAlign
  view.setUint16(34, bytesPerSample * 8, true); // BitsPerSample

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  return new Uint8Array(buffer);
}


async function generateAudio(req: Request, supabaseAdmin: any) {
    const { tts_request_id } = await req.json();
    if (!tts_request_id) throw new Error("Missing tts_request_id");

    console.log(`[${tts_request_id}] Starting TTS generation.`);

    // 1. Update request status to 'processing'
    await supabaseAdmin
      .from("tts_requests")
      .update({ status: "processing", updated_at: new Date().toISOString() })
      .eq("id", tts_request_id);
    
    console.log(`[${tts_request_id}] Status updated to 'processing'.`);

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
      .in("page", requestData.requested_pages)
      .order('page');

    if (textsError) throw textsError;

    if (!texts || texts.length === 0) {
        throw new Error("No text found for the requested pages.");
    }
    
    console.log(`[${tts_request_id}] Found ${texts.length} text pages to process.`);

    // 3. Generate audio for each page using Gemini Text-to-Speech API
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set in environment variables.");
    }
    const genAI = new GoogleGenAI({ apiKey });
    const model = 'gemini-2.5-flash-preview-tts';
    const config = {
        responseModalities: ['audio'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: 'Zephyr',
            }
          }
        },
    };

    for (const text of texts) {
      console.log(`[${tts_request_id}] Generating audio for page ${text.page}.`);
      
      const contents = [{
        role: 'user',
        parts: [{ text: text.content }],
      }];

      let audioContentB64 = '';
      let mimeType = '';

      try {
        const response = await genAI.models.generateContentStream({
            model,
            config,
            contents,
        });

        for await (const chunk of response) {
            const part = chunk.candidates?.[0]?.content?.parts?.[0];
            if (part?.inlineData) {
                audioContentB64 += part.inlineData.data;
                if (!mimeType) {
                    mimeType = part.inlineData.mimeType;
                }
            } else if (chunk.text) {
                console.warn(`[${tts_request_id}] Gemini returned text instead of audio for page ${text.page}: ${chunk.text}`);
            }
        }
      } catch (e) {
          console.error(`[${tts_request_id}] Gemini TTS API error for page ${text.page}:`, e);
          throw new Error(`Gemini TTS API error for page ${text.page}: ${e.message}`);
      }
      

      if (audioContentB64) {
        console.log(`[${tts_request_id}] Received audio content for page ${text.page}. Mime type: ${mimeType}`);
        const binaryString = atob(audioContentB64);
        const len = binaryString.length;
        const pcmData = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            pcmData[i] = binaryString.charCodeAt(i);
        }

        const sampleRate = 24000;
        const bytesPerSample = 2; // 16-bit
        const numChannels = 1; // Mono
        const numFrames = pcmData.length / (bytesPerSample * numChannels);

        const header = createWavHeader({
          numFrames,
          sampleRate,
          numChannels,
          bytesPerSample,
        });
        
        const wavData = new Uint8Array(header.length + pcmData.length);
        wavData.set(header, 0);
        wavData.set(pcmData, header.length);
        
        const filePath = `${tts_request_id}/${text.page}.wav`;
        console.log(`[${tts_request_id}] Uploading ${filePath} to storage.`);

        // Upload to storage
        const { error: uploadError } = await supabaseAdmin.storage
          .from("tts")
          .upload(filePath, wavData.buffer, {
            contentType: "audio/wav",
            upsert: true,
          });
        if (uploadError) {
          console.error(`[${tts_request_id}] Upload error for page ${text.page}:`, uploadError);
          throw uploadError;
        }

        // Insert into tts_audio_files
        await supabaseAdmin.from("tts_audio_files").insert({
          tts_request_id,
          page_number: text.page,
          storage_path: filePath,
          file_size: wavData.length,
        });
        console.log(`[${tts_request_id}] Successfully processed page ${text.page}.`);
      } else {
        throw new Error(`No audio content received from Gemini for page ${text.page}.`);
      }
    }

    // 4. Update status to 'generated'
    await supabaseAdmin
      .from("tts_requests")
      .update({ status: "generated", updated_at: new Date().toISOString() })
      .eq("id", tts_request_id);
    console.log(`[${tts_request_id}] All pages processed. Status updated to 'generated'.`);
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
        
        let tts_request_id_for_error_handling : string | null = null;
        try {
            const cloned_req = req.clone();
            const body = await cloned_req.json();
            if(body.tts_request_id) {
                tts_request_id_for_error_handling = body.tts_request_id;
            }
        } catch(e) {
            // ignore if can't parse body
        }

        // Run generation in background, don't await
        generateAudio(req, supabaseAdmin).catch(async (error) => {
            console.error("TTS Generation Error:", error);
            // Best effort to update status to failed
            if(tts_request_id_for_error_handling) {
                try {
                    await supabaseAdmin.from("tts_requests").update({ status: "failed" }).eq("id", tts_request_id_for_error_handling);
                } catch (e) {
                    console.error("Failed to update status to failed:", e)
                }
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
