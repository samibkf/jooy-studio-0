
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "npm:@google/generative-ai";
import mime from "npm:mime";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WavConversionOptions {
  numChannels: number;
  sampleRate: number;
  bitsPerSample: number;
}

function parseMimeType(mimeType: string) {
  const [fileType, ...params] = mimeType.split(";").map((s) => s.trim());
  const [_, format] = fileType.split("/");

  const options: Partial<WavConversionOptions> = {
    numChannels: 1,
  };

  if (format && format.startsWith("L")) {
    const bits = parseInt(format.slice(1), 10);
    if (!isNaN(bits)) {
      options.bitsPerSample = bits;
    }
  }

  for (const param of params) {
    const [key, value] = param.split("=").map((s) => s.trim());
    if (key === "rate") {
      options.sampleRate = parseInt(value, 10);
    }
  }

  return options as WavConversionOptions;
}

function createWavHeader(dataLength: number, options: WavConversionOptions) {
  const { numChannels, sampleRate, bitsPerSample } = options;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const buffer = new Uint8Array(44);
  const view = new DataView(buffer.buffer);

  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + dataLength, true); // ChunkSize
  view.setUint32(8, 0x57415645, false); // "WAVE"
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true); // Subchunk1Size
  view.setUint16(20, 1, true); // AudioFormat
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, byteRate, true); // ByteRate
  view.setUint16(32, blockAlign, true); // BlockAlign
  view.setUint16(34, bitsPerSample, true); // BitsPerSample
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, dataLength, true); // Subchunk2Size

  return buffer;
}

function convertToWav(rawData: string, mimeType: string) {
    const options = parseMimeType(mimeType);
    
    // Decode base64
    const binaryString = atob(rawData);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    
    const wavHeader = createWavHeader(bytes.length, options);
    
    const wavBytes = new Uint8Array(wavHeader.length + bytes.length);
    wavBytes.set(wavHeader, 0);
    wavBytes.set(bytes, wavHeader.length);

    return wavBytes;
}

async function generateAudio(req: Request) {
  try {
    const { tts_request_id } = await req.json();
    if (!tts_request_id) throw new Error("Missing tts_request_id");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const genAI = new GoogleGenerativeAI(Deno.env.get("GEMINI_API_KEY")!);

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
    
    // 3. Generate audio for each page
    for (const text of texts) {
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash-preview",
      });
      const ttsModel = model.startFunctionCall({
          name: 'text_to_speech',
      });
      const ttsResponse = await ttsModel.sendFunctionResponse(
        {
          parts: [
            {
              functionResponse: {
                name: 'text_to_speech',
                response: {
                  synthesizeSpeech: {
                    text: text.content,
                    voice: "Zephyr",
                    audioProfile: "telephony-class-application",
                  },
                },
              },
            },
          ],
        }
      );
      
      const audioPart = ttsResponse.response.candidates[0].content.parts[0];
      if (audioPart.inlineData) {
        const { data: rawAudioData, mimeType } = audioPart.inlineData;
        const wavBuffer = convertToWav(rawAudioData, mimeType);
        const filePath = `${tts_request_id}/${text.page}.wav`;

        // Upload to storage
        const { error: uploadError } = await supabaseAdmin.storage
          .from("tts")
          .upload(filePath, wavBuffer, {
            contentType: "audio/wav",
            upsert: true,
          });
        if (uploadError) throw uploadError;

        // Insert into tts_audio_files
        await supabaseAdmin.from("tts_audio_files").insert({
          tts_request_id,
          page_number: text.page,
          storage_path: filePath,
          file_size: wavBuffer.length,
        });
      }
    }

    // 4. Update status to 'generated'
    await supabaseAdmin
      .from("tts_requests")
      .update({ status: "generated", updated_at: new Date().toISOString() })
      .eq("id", tts_request_id);

  } catch (error) {
    console.error("TTS Generation Error:", error);
    // Best effort to update status to failed
    try {
        const body = await req.json();
        if(body.tts_request_id) {
            const supabaseAdmin = createClient(
                Deno.env.get("SUPABASE_URL")!,
                Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
            );
            await supabaseAdmin.from("tts_requests").update({ status: "failed" }).eq("id", body.tts_request_id);
        }
    } catch (e) {
        console.error("Failed to update status to failed:", e)
    }
  }
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    // Run generation in background, don't await
    generateAudio(req);
    
    return new Response(JSON.stringify({ message: "TTS Generation process started." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 202,
    });
});
