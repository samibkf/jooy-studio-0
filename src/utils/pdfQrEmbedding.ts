import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, rgb } from 'pdf-lib';
import QRCode from 'qrcode';

export interface QRCodeData {
  pageNumber: number;
  content: string;
  dataUrl: string;
}

/**
 * Generate a single QR code with transparent background
 */
export const generateTransparentQRCode = async (content: string): Promise<string> => {
  try {
    const dataUrl = await QRCode.toDataURL(content, {
      width: 256,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#00000000' // Transparent background
      },
      errorCorrectionLevel: 'M'
    });
    return dataUrl;
  } catch (error) {
    console.error('Error generating transparent QR code:', error);
    throw new Error(`Failed to generate QR code for content: ${content}`);
  }
};

/**
 * Generate transparent QR codes for all pages of a document
 */
export const generateTransparentBulkQRCodes = async (
  documentId: string,
  totalPages: number,
  onProgress?: (progress: number) => void
): Promise<QRCodeData[]> => {
  const qrCodes: QRCodeData[] = [];
  
  for (let page = 1; page <= totalPages; page++) {
    const content = `${documentId}${page}`;
    
    try {
      const dataUrl = await generateTransparentQRCode(content);
      qrCodes.push({
        pageNumber: page,
        content,
        dataUrl
      });
      
      // Report progress
      if (onProgress) {
        onProgress((page / totalPages) * 100);
      }
    } catch (error) {
      console.error(`Failed to generate QR code for page ${page}:`, error);
      throw new Error(`Failed to generate QR code for page ${page}`);
    }
  }
  
  return qrCodes;
};

/**
 * Convert QR code data URL to image bytes for pdf-lib
 */
const convertQRCodeToImageBytes = async (qrCodeDataUrl: string): Promise<Uint8Array> => {
  try {
    // Remove data URL prefix
    const base64Data = qrCodeDataUrl.split(',')[1];
    
    // Convert base64 to binary
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    return bytes;
  } catch (error) {
    console.error('Error converting QR code to image bytes:', error);
    throw new Error('Failed to convert QR code to image bytes');
  }
};

/**
 * Embed QR codes into PDF pages at specified corners
 * Accepts ArrayBuffer (not File anymore!)
 */
export const embedQRCodeIntoPDF = async (
  pdfInput: ArrayBuffer,
  qrCodes: QRCodeData[],
  corner: 'top-left' | 'top-right'
): Promise<Uint8Array> => {
  try {
    console.log('Starting PDF QR embedding process...');
    // Load the PDF document using pdf-lib
    const pdfDoc = await PDFDocument.load(pdfInput);
    const pages = pdfDoc.getPages();
    console.log(`PDF loaded with ${pages.length} pages`);
    for (const qrCode of qrCodes) {
      const pageIndex = qrCode.pageNumber - 1;
      if (pageIndex >= 0 && pageIndex < pages.length) {
        const page = pages[pageIndex];
        const { width, height } = page.getSize();
        try {
          // Convert QR code to image bytes
          const base64Data = qrCode.dataUrl.split(',')[1];
          const binaryString = atob(base64Data);
          const qrImageBytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            qrImageBytes[i] = binaryString.charCodeAt(i);
          }
          // Embed the PNG image
          const qrImage = await pdfDoc.embedPng(qrImageBytes);
          // Calculate position
          const qrSize = 60;
          const margin = 15;
          let x: number, y: number;
          if (corner === 'top-left') {
            x = margin;
            y = height - margin - qrSize;
          } else {
            x = width - margin - qrSize;
            y = height - margin - qrSize;
          }
          page.drawImage(qrImage, {
            x,
            y,
            width: qrSize,
            height: qrSize,
          });
          console.log(`QR code embedded on page ${qrCode.pageNumber} at ${corner}`);
        } catch (pageError) {
          console.error(
            `Error embedding QR code on page ${qrCode.pageNumber}:`,
            pageError
          );
        }
      }
    }
    const modifiedPdfBytes = await pdfDoc.save();
    console.log('PDF QR embedding completed successfully');
    return modifiedPdfBytes;
  } catch (error) {
    console.error('Error embedding QR codes into PDF:', error);
    throw new Error(
      'Failed to embed QR codes into PDF: ' +
        (error instanceof Error ? error.message : 'Unknown error')
    );
  }
};

/**
 * Download the PDF with embedded QR codes
 */
export const downloadPDFWithQRCodes = async (
  pdfBytes: Uint8Array,
  documentName: string
): Promise<void> => {
  try {
    // Create blob with PDF MIME type
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    
    // Create download link
    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(blob);
    
    // Set filename with proper extension
    const fileName = `${documentName.replace(/\.pdf$/i, '')}_with_QRCodes.pdf`;
    downloadLink.download = fileName;
    
    // Trigger download
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    
    // Clean up the object URL
    setTimeout(() => URL.revokeObjectURL(downloadLink.href), 100);
    
    console.log(`PDF with QR codes downloaded: ${fileName}`);
  } catch (error) {
    console.error('Error downloading PDF with QR codes:', error);
    throw new Error('Failed to download PDF with QR codes');
  }
};
