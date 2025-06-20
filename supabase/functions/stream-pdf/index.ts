
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
      throw new Error('document_id or id parameter is required')
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Try multiple file path strategies
    const filePaths = userId 
      ? [`${userId}/${finalDocumentId}.pdf`, `${finalDocumentId}.pdf`]
      : [`${finalDocumentId}.pdf`]

    console.log(`[STREAM-PDF] Will try file paths:`, filePaths);

    let fileBlob = null
    let fileSize = 0
    let successfulPath = null

    // Attempt to find the file using different path strategies
    for (const filePath of filePaths) {
      try {
        console.log(`[STREAM-PDF] Trying to download: ${filePath}`);
        
        // Try to get file metadata first
        const { data: fileList, error: listError } = await supabaseAdmin.storage
          .from('pdfs')
          .list(filePath.includes('/') ? filePath.split('/')[0] : '', {
            search: filePath.includes('/') ? filePath.split('/')[1] : filePath,
            limit: 1
          })

        if (listError || !fileList || fileList.length === 0) {
          console.log(`[STREAM-PDF] File not found in list: ${filePath}`);
          continue
        }

        fileSize = fileList[0].metadata?.size || 0
        console.log(`[STREAM-PDF] Found file: ${filePath}, size: ${fileSize}`);

        // Download the file
        const { data: downloadedFile, error: downloadError } = await supabaseAdmin.storage
          .from('pdfs')
          .download(filePath)

        if (downloadError) {
          console.log(`[STREAM-PDF] Download error for ${filePath}:`, downloadError);
          continue
        }

        if (downloadedFile) {
          fileBlob = downloadedFile
          successfulPath = filePath
          console.log(`[STREAM-PDF] Successfully downloaded: ${filePath}`);
          break
        }
      } catch (error) {
        console.log(`[STREAM-PDF] Error accessing ${filePath}:`, error);
      }
    }

    if (!fileBlob || !successfulPath) {
      console.error(`[STREAM-PDF] File not found after trying all paths:`, filePaths);
      throw new Error(`PDF file not found for document: ${finalDocumentId}`)
    }

    // Handle range requests
    const range = req.headers.get('range')
    let start = 0
    let end = fileSize - 1
    let status = 200

    if (range && fileSize > 0) {
      const parts = range.replace(/bytes=/, '').split('-')
      start = parseInt(parts[0], 10) || 0
      end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
      status = 206
      console.log(`[STREAM-PDF] Range request: ${start}-${end}/${fileSize}`);
    }

    // Convert blob to array buffer
    const arrayBuffer = await fileBlob.arrayBuffer()
    
    // Extract the requested range
    const chunk = arrayBuffer.slice(start, end + 1)
    const chunkSize = chunk.byteLength

    console.log(`[STREAM-PDF] Serving chunk: ${chunkSize} bytes`);

    // Prepare response headers
    const responseHeaders = new Headers({
      ...corsHeaders,
      'Content-Type': 'application/pdf',
      'Content-Length': chunkSize.toString(),
      'Cache-Control': 'public, max-age=3600',
    })

    if (status === 206) {
      responseHeaders.set('Content-Range', `bytes ${start}-${end}/${fileSize}`)
    }

    // For encrypted content support (if needed by client)
    if (req.headers.get('accept')?.includes('encrypted')) {
      // Generate simple encryption keys for demo
      const encryptionKey = btoa(Math.random().toString(36).substring(7))
      const encryptionIV = btoa(Math.random().toString(36).substring(7))
      
      responseHeaders.set('X-Encryption-Key', encryptionKey)
      responseHeaders.set('X-Encryption-IV', encryptionIV)
    }

    return new Response(chunk, {
      status,
      headers: responseHeaders,
    })

  } catch (error) {
    console.error('[STREAM-PDF] Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 404,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      },
    })
  }
})
