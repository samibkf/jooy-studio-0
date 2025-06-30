
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, range',
  'Accept-Ranges': 'bytes',
}

interface WorksheetResponse {
  meta: {
    document: {
      id: string;
      name: string;
      created_at: string;
      is_private: boolean;
      drm_protected_pages: any;
      user_id: string | null;
    };
    regions: Array<{
      id: string;
      name: string;
      description: string | null;
      type: string;
      page: number;
      x: number;
      y: number;
      width: number;
      height: number;
      document_id: string;
      user_id: string;
      created_at: string;
    }>;
    texts: Array<{
      id: string;
      title: string;
      content: string;
      page: number;
      order_index: number;
      document_id: string;
      user_id: string;
      assigned_region_id: string | null;
      created_at: string;
    }>;
  };
  pdfUrl: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`[${new Date().toISOString()}] Processing request: ${req.method}`);

    const url = new URL(req.url);
    const worksheetId = url.searchParams.get('worksheetId') || '';
    const streamPdf = url.searchParams.get('stream') === 'pdf';

    // Validate worksheetId
    if (!worksheetId || typeof worksheetId !== 'string' || worksheetId.trim() === '') {
      console.log(`[${new Date().toISOString()}] Missing or invalid worksheetId`);
      return new Response(
        JSON.stringify({ error: 'worksheetId is required and must be a non-empty string' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Create Supabase admin client using SERVICE_ROLE_KEY to bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error(`[${new Date().toISOString()}] Missing Supabase configuration`);
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Handle PDF streaming request
    if (streamPdf) {
      console.log(`[${new Date().toISOString()}] Streaming PDF for worksheet: ${worksheetId}`);

      // Try both path patterns for backward compatibility
      const pdfPaths = [
        `${worksheetId}.pdf`, // Flat path for backward compatibility
        // We'll also check for user-specific paths if needed
      ];

      let fileData = null;
      let fileSize = 0;
      let successfulPath = '';

      // First, get file metadata to determine size
      for (const pdfPath of pdfPaths) {
        try {
          console.log(`[${new Date().toISOString()}] Checking file metadata for: ${pdfPath}`);
          
          const { data: files, error: listError } = await supabaseAdmin.storage
            .from('pdfs')
            .list('', { 
              limit: 1000,
              search: pdfPath
            });

          if (!listError && files && files.length > 0) {
            const file = files.find(f => f.name === pdfPath || f.name.endsWith(pdfPath));
            if (file && file.metadata?.size) {
              fileSize = file.metadata.size;
              successfulPath = pdfPath;
              console.log(`[${new Date().toISOString()}] Found file: ${pdfPath}, size: ${fileSize} bytes`);
              break;
            }
          }
        } catch (error) {
          console.log(`[${new Date().toISOString()}] Error checking metadata for ${pdfPath}:`, error);
        }
      }

      if (!fileSize || !successfulPath) {
        console.error(`[${new Date().toISOString()}] PDF file not found for worksheet: ${worksheetId}`);
        return new Response(
          JSON.stringify({ error: 'PDF file not found' }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // Parse Range header
      const rangeHeader = req.headers.get('range');
      let start = 0;
      let end = fileSize - 1;

      if (rangeHeader) {
        const rangeMatch = rangeHeader.match(/bytes=(\d*)-(\d*)/);
        if (rangeMatch) {
          if (rangeMatch[1]) start = parseInt(rangeMatch[1]);
          if (rangeMatch[2]) end = parseInt(rangeMatch[2]);
        }
      }

      const chunkSize = end - start + 1;

      console.log(`[${new Date().toISOString()}] Streaming bytes ${start}-${end}/${fileSize} (${chunkSize} bytes)`);

      // Download the requested chunk
      try {
        const { data: chunkData, error: downloadError } = await supabaseAdmin.storage
          .from('pdfs')
          .download(successfulPath, {
            transform: {
              width: undefined,
              height: undefined,
            }
          });

        if (downloadError || !chunkData) {
          console.error(`[${new Date().toISOString()}] Error downloading chunk:`, downloadError);
          return new Response(
            JSON.stringify({ error: 'Error downloading PDF chunk' }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

        // Convert blob to array buffer and slice the requested range
        const fullBuffer = await chunkData.arrayBuffer();
        const requestedChunk = fullBuffer.slice(start, end + 1);

        const responseHeaders = {
          ...corsHeaders,
          'Content-Type': 'application/pdf',
          'Content-Length': chunkSize.toString(),
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        };

        const status = rangeHeader ? 206 : 200;

        console.log(`[${new Date().toISOString()}] Successfully streaming PDF chunk, status: ${status}`);

        return new Response(requestedChunk, {
          status,
          headers: responseHeaders,
        });

      } catch (error) {
        console.error(`[${new Date().toISOString()}] Error processing PDF chunk:`, error);
        return new Response(
          JSON.stringify({ error: 'Error processing PDF chunk' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // Handle metadata request (existing functionality)
    console.log(`[${new Date().toISOString()}] Fetching metadata for worksheet: ${worksheetId}`);

    // Query the documents table to find the worksheet
    const { data: document, error: docError } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('id', worksheetId)
      .single();

    if (docError) {
      if (docError.code === 'PGRST116') { // No rows returned
        console.log(`[${new Date().toISOString()}] Worksheet not found: ${worksheetId}`);
        return new Response(
          JSON.stringify({ error: 'Worksheet not found' }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      console.error(`[${new Date().toISOString()}] Database error querying document:`, docError);
      return new Response(
        JSON.stringify({ error: 'Database error' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!document) {
      console.log(`[${new Date().toISOString()}] No document found for worksheetId: ${worksheetId}`);
      return new Response(
        JSON.stringify({ error: 'Worksheet not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`[${new Date().toISOString()}] Found document: ${document.name}`);

    // Fetch related document regions
    const { data: regions, error: regionsError } = await supabaseAdmin
      .from('document_regions')
      .select('*')
      .eq('document_id', worksheetId)
      .order('page', { ascending: true });

    if (regionsError) {
      console.error(`[${new Date().toISOString()}] Error fetching document regions:`, regionsError);
      return new Response(
        JSON.stringify({ error: 'Error fetching document regions' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Fetch related document texts
    const { data: texts, error: textsError } = await supabaseAdmin
      .from('document_texts')
      .select('*')
      .eq('document_id', worksheetId)
      .order('order_index', { ascending: true });

    if (textsError) {
      console.error(`[${new Date().toISOString()}] Error fetching document texts:`, textsError);
      return new Response(
        JSON.stringify({ error: 'Error fetching document texts' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // For metadata requests, return the streaming URL pointing to this same function
    const streamingUrl = `${supabaseUrl}/functions/v1/get-worksheet-data?worksheetId=${worksheetId}&stream=pdf`;

    // Construct the response payload
    const responsePayload: WorksheetResponse = {
      meta: {
        document: {
          id: document.id,
          name: document.name,
          created_at: document.created_at,
          is_private: document.is_private,
          drm_protected_pages: document.drm_protected_pages,
          user_id: document.user_id
        },
        regions: regions || [],
        texts: texts || []
      },
      pdfUrl: streamingUrl
    };

    console.log(`[${new Date().toISOString()}] Successfully processed worksheet metadata: ${worksheetId}, regions: ${regions?.length || 0}, texts: ${texts?.length || 0}`);

    return new Response(
      JSON.stringify(responsePayload),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Unexpected error:`, error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
