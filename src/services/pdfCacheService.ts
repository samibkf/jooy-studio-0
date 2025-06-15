interface CachedPDF {
  id: string;
  data: ArrayBuffer;
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
  private dbInstance: IDBDatabase | null = null;

  async initDB(): Promise<IDBDatabase> {
    if (this.dbInstance && !this.dbInstance.objectStoreNames.contains('closed')) {
      return this.dbInstance;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => {
        console.error('IndexedDB error:', request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        this.dbInstance = request.result;
        resolve(request.result);
      };
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async getCachedPDF(documentId: string): Promise<ArrayBuffer | null> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      
      return new Promise((resolve, reject) => {
        const request = store.get(documentId);
        
        request.onerror = () => {
          console.error('Error getting cached PDF:', request.error);
          reject(request.error);
        };
        
        request.onsuccess = () => {
          const result = request.result as CachedPDF | undefined;
          
          if (!result) {
            console.log(`No cached PDF found for document: ${documentId}`);
            resolve(null);
            return;
          }
          
          // Check if cache is expired
          const now = Date.now();
          if (now - result.timestamp > this.cacheExpiryMs) {
            console.log(`Cache expired for document: ${documentId}`);
            // Cache expired, remove it
            this.removeCachedPDF(documentId);
            resolve(null);
            return;
          }
          
          console.log(`Using cached PDF for document: ${documentId}`);
          resolve(result.data);
        };
      });
    } catch (error) {
      console.error('Error getting cached PDF:', error);
      return null;
    }
  }

  async cachePDF(documentId: string, data: ArrayBuffer): Promise<boolean> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      const cachedPDF: CachedPDF = {
        id: documentId,
        data,
        timestamp: Date.now(),
        version: '1.0'
      };
      
      return new Promise((resolve, reject) => {
        const request = store.put(cachedPDF);
        
        request.onerror = () => {
          console.error('Error caching PDF:', request.error);
          reject(request.error);
        };
        
        request.onsuccess = () => {
          console.log(`Successfully cached PDF for document: ${documentId}`);
          resolve(true);
        };
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
        
        request.onerror = () => {
          console.error('Error removing cached PDF:', request.error);
          reject(request.error);
        };
        
        request.onsuccess = () => {
          console.log(`Successfully removed cached PDF for document: ${documentId}`);
          resolve(true);
        };
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
        
        request.onerror = () => {
          console.error('Error clearing expired cache:', request.error);
          reject(request.error);
        };
        
        request.onsuccess = () => {
          const cursor = request.result;
          if (cursor) {
            console.log(`Removing expired cache for document: ${cursor.value.id}`);
            cursor.delete();
            cursor.continue();
          } else {
            console.log('Finished clearing expired cache');
            resolve();
          }
        };
      });
    } catch (error) {
      console.error('Error clearing expired cache:', error);
    }
  }

  async isCached(documentId: string): Promise<boolean> {
    const cachedData = await this.getCachedPDF(documentId);
    return cachedData !== null;
  }
}

export const pdfCacheService = new PDFCacheService();
