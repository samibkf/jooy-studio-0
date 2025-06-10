
import QRCode from 'qrcode';
import JSZip from 'jszip';

export interface QRCodeData {
  pageNumber: number;
  content: string;
  dataUrl: string;
}

/**
 * Generate a single QR code as base64 data URL
 */
export const generateQRCode = async (content: string): Promise<string> => {
  try {
    const dataUrl = await QRCode.toDataURL(content, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    });
    return dataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error(`Failed to generate QR code for content: ${content}`);
  }
};

/**
 * Generate QR codes for all pages of a document
 */
export const generateBulkQRCodes = async (
  documentId: string,
  totalPages: number,
  onProgress?: (progress: number) => void
): Promise<QRCodeData[]> => {
  const qrCodes: QRCodeData[] = [];
  
  for (let page = 1; page <= totalPages; page++) {
    const content = `${documentId}${page}`;
    
    try {
      const dataUrl = await generateQRCode(content);
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
 * Convert data URL to blob
 */
const dataURLToBlob = (dataURL: string): Blob => {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  
  return new Blob([u8arr], { type: mime });
};

/**
 * Export QR codes as a downloadable ZIP file
 */
export const exportQRCodesAsZip = async (
  qrCodes: QRCodeData[],
  documentName: string
): Promise<void> => {
  try {
    const zip = new JSZip();
    
    // Create a text file listing all QR codes in order
    let qrCodeListText = "QR CODE LIST\n";
    qrCodeListText += "=============\n\n";
    
    for (const qrCode of qrCodes) {
      qrCodeListText += `Page ${qrCode.pageNumber}: ${qrCode.content}\n`;
    }
    
    // Add the text file to the ZIP archive
    zip.file("qr_code_list.txt", qrCodeListText);
    
    // Add each QR code to the ZIP
    for (const qrCode of qrCodes) {
      const blob = dataURLToBlob(qrCode.dataUrl);
      const fileName = `page_${qrCode.pageNumber}.png`;
      zip.file(fileName, blob);
    }
    
    // Generate the ZIP file
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    
    // Create and trigger download without using file-saver
    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(zipBlob);
    const fileName = `${documentName.replace(/\.pdf$/i, '')}_QRCodes.zip`;
    downloadLink.download = fileName;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    // Clean up the object URL
    setTimeout(() => URL.revokeObjectURL(downloadLink.href), 100);
  } catch (error) {
    console.error('Error creating ZIP file:', error);
    throw new Error('Failed to create ZIP file');
  }
};
