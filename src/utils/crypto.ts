
// Helper to decode Base64 string to Uint8Array
function base64ToArr(b64: string): Uint8Array {
  const byteString = atob(b64);
  const len = byteString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = byteString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Decrypts data using AES-GCM.
 * @param encryptedData The data to decrypt.
 * @param keyB64 The Base64 encoded encryption key.
 * @param ivB64 The Base64 encoded initialization vector.
 * @returns A promise that resolves with the decrypted data as an ArrayBuffer.
 */
export async function decryptData(
  encryptedData: ArrayBuffer,
  keyB64: string,
  ivB64: string
): Promise<ArrayBuffer> {
  try {
    const keyData = base64ToArr(keyB64);
    const iv = base64ToArr(ivB64);

    const cryptoKey = await window.crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "AES-GCM", length: 256 },
      true,
      ["decrypt"]
    );

    const decryptedData = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      cryptoKey,
      encryptedData
    );

    return decryptedData;
  } catch (error) {
    console.error("Decryption failed:", error);
    throw new Error("Failed to decrypt PDF data.");
  }
}
