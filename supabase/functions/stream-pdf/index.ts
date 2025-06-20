
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, range',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Accept-Ranges': 'bytes',
}

serve(async (req) => {
  console.log(`[STREAM-PDF] ${req.method} ${req.url} - ${new Date().toISOString()}`);
  
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    console.log('[STREAM-PDF] Handling CORS preflight');
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const worksheetId = url.searchParams.get('id')
    const documentId = url.searchParams.get('document_id')
    const userId = url.searchParams.get('user_id')

    // Support both parameter formats for compatibility
    const finalDocumentId = documentId || worksheetId
    
    console.log(`[STREAM-PDF] Parameters: documentId=${finalDocumentId}, userId=${userId}`);

    if (!finalDocumentId) {
      console.error('[STREAM-PDF] Missing required parameter: document_id or id');
      throw new Error('document_id or id parameter is required')
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Simple file path strategy: try user-specific first, then flat
    const filePaths = userId 
      ? [`${userId}/${finalDocumentId}.pdf`, `${finalDocumentId}.pdf`]
      : [`${finalDocumentId}.pdf`]

    console.log(`[STREAM-PDF] Trying file paths:`, filePaths);

    let fileBlob = null
    let successfulPath = null

    // Try each file path until we find the file
    for (const filePath of filePaths) {
      try {
        console.log(`[STREAM-PDF] Attempting to download: ${filePath}`);
        
        const { data: downloadedFile, error: downloadError } = await supabaseAdmin.storage
          .from('pdfs')
          .download(filePath)

        if (downloadError) {
          console.log(`[STREAM-PDF] Download failed for ${filePath}:`, downloadError.message);
          continue
        }

        if (downloadedFile) {
          fileBlob = downloadedFile
          successfulPath = filePath
          console.log(`[STREAM-PDF] Successfully downloaded: ${filePath}`);
          break
        }
      } catch (error) {
        console.log(`[STREAM-PDF] Error downloading ${filePath}:`, error.message);
      }
    }

    if (!fileBlob || !successfulPath) {
      console.error(`[STREAM-PDF] File not found after trying paths:`, filePaths);
      return new Response(JSON.stringify({ 
        error: `PDF file not found for document: ${finalDocumentId}`,
        attemptedPaths: filePaths,
        timestamp: new Date().toISOString()
      }), {
        status: 404,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      })
    }

    // Convert blob to array buffer for processing
    const arrayBuffer = await fileBlob.arrayBuffer()
    const fileSize = arrayBuffer.byteLength

    console.log(`[STREAM-PDF] File loaded successfully: ${fileSize} bytes`);

    // Handle range requests
    const range = req.headers.get('range')
    let start = 0
    let end = fileSize - 1
    let status = 200
    let responseData = arrayBuffer

    if (range && fileSize > 0) {
      const parts = range.replace(/bytes=/, '').split('-')
      start = parseInt(parts[0], 10) || 0
      end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
      
      // Ensure end doesn't exceed file size
      end = Math.min(end, fileSize - 1)
      
      status = 206
      responseData = arrayBuffer.slice(start, end + 1)
      console.log(`[STREAM-PDF] Range request: ${start}-${end}/${fileSize}, serving ${responseData.byteLength} bytes`);
    }

    // Prepare response headers
    const responseHeaders = new Headers({
      ...corsHeaders,
      'Content-Type': 'application/pdf',
      'Content-Length': responseData.byteLength.toString(),
      'Cache-Control': 'public, max-age=3600',
    })

    if (status === 206) {
      responseHeaders.set('Content-Range', `bytes ${start}-${end}/${fileSize}`)
    }

    // Add encryption headers if client requests encrypted content
    if (req.headers.get('accept')?.includes('encrypted')) {
      const encryptionKey = btoa(Math.random().toString(36).substring(7))
      const encryptionIV = btoa(Math.random().toString(36).substring(7))
      
      responseHeaders.set('X-Encryption-Key', encryptionKey)
      responseHeaders.set('X-Encryption-IV', encryptionIV)
      console.log('[STREAM-PDF] Added encryption headers for encrypted request');
    }

    console.log(`[STREAM-PDF] Responding with status ${status}, ${responseData.byteLength} bytes`);

    return new Response(responseData, {
      status,
      headers: responseHeaders,
    })

  } catch (error) {
    console.error('[STREAM-PDF] Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      },
    })
  }
})
