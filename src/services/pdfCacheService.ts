
interface CachedPDF {
  id: string;
  file: File;
  timestamp: number;
  version: string;
}

interface CacheDB extends IDBDatabase {
  transaction(storeNames: string | string[], mode?: IDBTransactionMode): IDBTransaction;
}

class PDFCacheService {
  private dbName = 'pdf-cache-db';
  private storeName = 'pdfs';
  private version = 1;
  private cacheExpiryMs = 7 * 24 * 60 * 60 * 1000; // 7 days

  async initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async getCachedPDF(documentId: string): Promise<File | null> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      
      return new Promise((resolve, reject) => {
        const request = store.get(documentId);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const result = request.result as CachedPDF | undefined;
          
          if (!result) {
            resolve(null);
            return;
          }
          
          // Check if cache is expired
          const now = Date.now();
          if (now - result.timestamp > this.cacheExpiryMs) {
            // Cache expired, remove it
            this.removeCachedPDF(documentId);
            resolve(null);
            return;
          }
          
          resolve(result.file);
        };
      });
    } catch (error) {
      console.error('Error getting cached PDF:', error);
      return null;
    }
  }

  async cachePDF(documentId: string, file: File): Promise<boolean> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      const cachedPDF: CachedPDF = {
        id: documentId,
        file,
        timestamp: Date.now(),
        version: '1.0'
      };
      
      return new Promise((resolve, reject) => {
        const request = store.put(cachedPDF);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(true);
      });
    } catch (error) {
      console.error('Error caching PDF:', error);
      return false;
    }
  }

  async removeCachedPDF(documentId: string): Promise<boolean> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      return new Promise((resolve, reject) => {
        const request = store.delete(documentId);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(true);
      });
    } catch (error) {
      console.error('Error removing cached PDF:', error);
      return false;
    }
  }

  async clearExpiredCache(): Promise<void> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('timestamp');
      
      const cutoffTime = Date.now() - this.cacheExpiryMs;
      const range = IDBKeyRange.upperBound(cutoffTime);
      
      return new Promise((resolve, reject) => {
        const request = index.openCursor(range);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const cursor = request.result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          } else {
            resolve();
          }
        };
      });
    } catch (error) {
      console.error('Error clearing expired cache:', error);
    }
  }
}

export const pdfCacheService = new PDFCacheService();
