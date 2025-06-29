
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, range',
  'Access-Control-Expose-Headers': 'content-range, accept-ranges, content-length',
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
    
    // Check if this is a PDF streaming request
    const isPdfStream = url.searchParams.get('stream') === 'pdf';
    
    if (isPdfStream) {
      return await handlePdfStream(req, url);
    }

    // Handle metadata request (existing logic)
    return await handleMetadataRequest(req, url);

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

async function handlePdfStream(req: Request, url: URL) {
  const worksheetId = url.searchParams.get('worksheetId');
  
  if (!worksheetId) {
    return new Response(
      JSON.stringify({ error: 'worksheetId is required for PDF streaming' }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  console.log(`[${new Date().toISOString()}] PDF streaming request for worksheet: ${worksheetId}`);

  // Create Supabase admin client
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  // Look up document to get file path
  const { data: document, error: docError } = await supabaseAdmin
    .from('documents')
    .select('*')
    .eq('id', worksheetId)
    .single();

  if (docError || !document) {
    console.log(`[${new Date().toISOString()}] Document not found: ${worksheetId}`);
    return new Response(
      JSON.stringify({ error: 'Document not found' }),
      { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  // Try both path patterns for backward compatibility
  const pdfPaths = [
    document.user_id ? `${document.user_id}/${worksheetId}.pdf` : null,
    `${worksheetId}.pdf`
  ].filter(Boolean);

  console.log(`[${new Date().toISOString()}] Trying PDF paths:`, pdfPaths);

  // Parse Range header if present
  const rangeHeader = req.headers.get('range');
  console.log(`[${new Date().toISOString()}] Range header:`, rangeHeader);

  for (const pdfPath of pdfPaths) {
    try {
      console.log(`[${new Date().toISOString()}] Attempting to stream: ${pdfPath}`);
      
      let downloadOptions: any = {};
      let isRangeRequest = false;
      let rangeStart = 0;
      let rangeEnd: number | undefined;

      // Parse range header for partial content requests
      if (rangeHeader) {
        const rangeMatch = rangeHeader.match(/bytes=(\d+)-(\d*)/);
        if (rangeMatch) {
          rangeStart = parseInt(rangeMatch[1]);
          rangeEnd = rangeMatch[2] ? parseInt(rangeMatch[2]) : undefined;
          isRangeRequest = true;
          
          // Set download options for range request
          downloadOptions = {
            transform: {
              width: undefined,
              height: undefined,
              resize: undefined,
              format: undefined,
              quality: undefined
            }
          };
          
          console.log(`[${new Date().toISOString()}] Range request: ${rangeStart}-${rangeEnd || 'end'}`);
        }
      }

      // Download file (or range) from storage
      const { data: fileData, error: downloadError } = await supabaseAdmin.storage
        .from('pdfs')
        .download(pdfPath, downloadOptions);

      if (downloadError) {
        console.log(`[${new Date().toISOString()}] Download error for ${pdfPath}:`, downloadError);
        continue;
      }

      console.log(`[${new Date().toISOString()}] Successfully downloaded PDF: ${pdfPath}`);

      // Convert blob to array buffer
      const arrayBuffer = await fileData.arrayBuffer();
      const totalSize = arrayBuffer.byteLength;

      // Handle range request
      if (isRangeRequest && rangeHeader) {
        const actualEnd = rangeEnd !== undefined ? Math.min(rangeEnd, totalSize - 1) : totalSize - 1;
        const actualStart = Math.min(rangeStart, totalSize - 1);
        
        if (actualStart >= totalSize) {
          return new Response(null, {
            status: 416,
            headers: {
              ...corsHeaders,
              'Content-Range': `bytes */${totalSize}`,
            }
          });
        }

        const chunk = arrayBuffer.slice(actualStart, actualEnd + 1);
        const chunkSize = chunk.byteLength;

        console.log(`[${new Date().toISOString()}] Serving range: ${actualStart}-${actualEnd}/${totalSize} (${chunkSize} bytes)`);

        return new Response(chunk, {
          status: 206,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/pdf',
            'Content-Length': chunkSize.toString(),
            'Content-Range': `bytes ${actualStart}-${actualEnd}/${totalSize}`,
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'public, max-age=3600',
          }
        });
      }

      // Full file response
      console.log(`[${new Date().toISOString()}] Serving full PDF: ${totalSize} bytes`);
      
      return new Response(arrayBuffer, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/pdf',
          'Content-Length': totalSize.toString(),
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=3600',
        }
      });

    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error streaming ${pdfPath}:`, error);
    }
  }

  // If we get here, no path worked
  return new Response(
    JSON.stringify({ error: 'PDF file not accessible' }),
    { 
      status: 404, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

async function handleMetadataRequest(req: Request, url: URL) {
  // Extract worksheetId from request body or query params
  let worksheetId: string;
  
  if (req.method === 'POST') {
    const body = await req.json();
    worksheetId = body.worksheetId;
  } else if (req.method === 'GET') {
    worksheetId = url.searchParams.get('worksheetId') || '';
  } else {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

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

  console.log(`[${new Date().toISOString()}] Looking for worksheet: ${worksheetId}`);

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

  // Query the documents table to find the worksheet
  console.log(`[${new Date().toISOString()}] Querying documents table for worksheet: ${worksheetId}`);
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
  console.log(`[${new Date().toISOString()}] Fetching document regions for worksheet: ${worksheetId}`);
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
  console.log(`[${new Date().toISOString()}] Fetching document texts for worksheet: ${worksheetId}`);
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

  // Generate streaming PDF URL instead of signed URL
  const baseUrl = `${supabaseUrl}/functions/v1/get-worksheet-data`;
  const streamingPdfUrl = `${baseUrl}?worksheetId=${worksheetId}&stream=pdf`;

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
    pdfUrl: streamingPdfUrl
  };

  console.log(`[${new Date().toISOString()}] Successfully processed worksheet: ${worksheetId}, regions: ${regions?.length || 0}, texts: ${texts?.length || 0}`);

  return new Response(
    JSON.stringify(responsePayload),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}
