
import { supabase } from '@/integrations/supabase/client';
import * as pdfjs from 'pdfjs-dist';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url,
).toString();


export async function getDocumentPageCount(documentId: string, userId: string): Promise<number> {
    const { data, error } = await supabase.storage
        .from('pdfs')
        .download(`${userId}/${documentId}.pdf`);

    if (error) {
        console.error('Error downloading PDF:', error);
        throw new Error('Failed to download PDF from storage.');
    }

    const arrayBuffer = await data.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    return pdf.numPages;
}
