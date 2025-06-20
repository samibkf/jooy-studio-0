import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Extract worksheetId from request body or query params
    let worksheetId: string;
    
    if (req.method === 'POST') {
      const body = await req.json();
      worksheetId = body.worksheetId;
    } else if (req.method === 'GET') {
      const url = new URL(req.url);
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

    // Generate signed URL for the PDF file from private bucket
    console.log(`[${new Date().toISOString()}] Generating signed URL for PDF: ${worksheetId}.pdf`);
    
    // Try both path patterns for backward compatibility
    const pdfPaths = [
      document.user_id ? `${document.user_id}/${worksheetId}.pdf` : null, // User-specific path
      `${worksheetId}.pdf` // Flat path for backward compatibility
    ].filter(Boolean);

    let signedUrl = null;
    
    for (const pdfPath of pdfPaths) {
      console.log(`[${new Date().toISOString()}] Trying path: ${pdfPath}`);
      const { data: signedUrlData, error: urlError } = await supabaseAdmin.storage
        .from('pdfs')
        .createSignedUrl(pdfPath, 300); // 5 minutes expiration

      if (!urlError && signedUrlData?.signedUrl) {
        signedUrl = signedUrlData.signedUrl;
        console.log(`[${new Date().toISOString()}] Successfully generated signed URL for path: ${pdfPath}`);
        break;
      } else {
        console.log(`[${new Date().toISOString()}] Failed to generate signed URL for path: ${pdfPath}`, urlError);
      }
    }

    if (!signedUrl) {
      console.error(`[${new Date().toISOString()}] No signed URL generated for any PDF path`);
      return new Response(
        JSON.stringify({ error: 'PDF file not accessible' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

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
      pdfUrl: signedUrl
    };

    console.log(`[${new Date().toISOString()}] Successfully processed worksheet: ${worksheetId}, regions: ${regions?.length || 0}, texts: ${texts?.length || 0}`);

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
