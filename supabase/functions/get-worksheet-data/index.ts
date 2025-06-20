
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  console.log(`[GET-WORKSHEET-DATA] ${req.method} ${req.url} - ${new Date().toISOString()}`);
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    console.log("[GET-WORKSHEET-DATA] Handling CORS preflight");
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    console.log("[GET-WORKSHEET-DATA] Method not allowed:", req.method);
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { worksheetId } = await req.json();
    
    console.log(`[GET-WORKSHEET-DATA] Request for worksheet: ${worksheetId}`);
    
    if (!worksheetId) {
      console.error("[GET-WORKSHEET-DATA] No worksheetId provided");
      return new Response(JSON.stringify({ error: "worksheetId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    console.log(`[GET-WORKSHEET-DATA] Fetching data for worksheet: ${worksheetId}`);

    // Fetch document metadata
    const { data: document, error: docError } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('id', worksheetId)
      .single();

    if (docError) {
      console.error(`[GET-WORKSHEET-DATA] Document fetch error:`, docError);
      return new Response(JSON.stringify({ 
        error: "Document not found",
        details: docError.message 
      }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch document regions
    const { data: regions, error: regionsError } = await supabaseAdmin
      .from('document_regions')
      .select('*')
      .eq('document_id', worksheetId)
      .order('page', { ascending: true });

    if (regionsError) {
      console.error(`[GET-WORKSHEET-DATA] Regions fetch error:`, regionsError);
    }

    // Fetch document texts
    const { data: texts, error: textsError } = await supabaseAdmin
      .from('document_texts')
      .select('*')
      .eq('document_id', worksheetId)
      .order('page', { ascending: true })
      .order('order_index', { ascending: true });

    if (textsError) {
      console.error(`[GET-WORKSHEET-DATA] Texts fetch error:`, textsError);
    }

    // Fetch text assignments
    const { data: assignments, error: assignmentsError } = await supabaseAdmin
      .from('text_assignments')
      .select('*')
      .eq('document_id', worksheetId);

    if (assignmentsError) {
      console.error(`[GET-WORKSHEET-DATA] Assignments fetch error:`, assignmentsError);
    }

    const responseData = {
      document,
      regions: regions || [],
      texts: texts || [],
      assignments: assignments || [],
      success: true,
      timestamp: new Date().toISOString()
    };

    console.log(`[GET-WORKSHEET-DATA] Successfully fetched data for ${worksheetId}: ${regions?.length || 0} regions, ${texts?.length || 0} texts, ${assignments?.length || 0} assignments`);

    return new Response(JSON.stringify(responseData), {
      headers: { 
        ...corsHeaders, 
        "Content-Type": "application/json",
        "Cache-Control": "private, max-age=300"
      },
    });

  } catch (err) {
    console.error("[GET-WORKSHEET-DATA] Unexpected error:", err);
    return new Response(JSON.stringify({ 
      error: err?.message || "An unexpected error occurred",
      success: false,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
