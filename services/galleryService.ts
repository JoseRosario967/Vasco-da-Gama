
import { SavedImage, Watermark, PromptTemplate } from "../types";

const DB_NAME = 'NexusAI_GalleryDB';
const IMAGES_STORE = 'images';
const WATERMARKS_STORE = 'watermarks';
const TEMPLATES_STORE = 'templates'; // NEW STORE
const DB_VERSION = 3; // Upgraded version for Templates

/**
 * Opens the IndexedDB database with disaster recovery.
 */
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create Images Store if not exists
      if (!db.objectStoreNames.contains(IMAGES_STORE)) {
        const store = db.createObjectStore(IMAGES_STORE, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('tags', 'tags', { unique: false, multiEntry: true });
      }

      // Create Watermarks Store if not exists
      if (!db.objectStoreNames.contains(WATERMARKS_STORE)) {
        db.createObjectStore(WATERMARKS_STORE, { keyPath: 'id' });
      }

      // Create Templates Store if not exists (NEW)
      if (!db.objectStoreNames.contains(TEMPLATES_STORE)) {
        db.createObjectStore(TEMPLATES_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      db.onversionchange = () => {
        db.close();
        console.warn("Database version changed. Closing connection.");
      };

      resolve(db);
    };

    request.onerror = (event) => {
      console.error("DB Open Error:", (event.target as IDBOpenDBRequest).error);
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
};

// ==========================================
// IMAGE GALLERY OPERATIONS
// ==========================================

export const saveImageToGallery = async (
  imageUrl: string,
  prompt: string,
  tags: string[] = []
): Promise<SavedImage> => {
  const db = await openDB();
  
  const arr = imageUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
  const base64 = arr[1];

  const image: SavedImage = {
    id: Date.now().toString(),
    base64Data: base64,
    mimeType: mime,
    timestamp: Date.now(),
    prompt: prompt,
    tags: tags
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([IMAGES_STORE], 'readwrite');
    const store = transaction.objectStore(IMAGES_STORE);
    const request = store.put(image);

    request.onsuccess = () => resolve(image);
    request.onerror = () => reject(request.error);
  });
};

export const getAllImages = async (): Promise<SavedImage[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([IMAGES_STORE], 'readonly');
    const store = transaction.objectStore(IMAGES_STORE);
    const index = store.index('timestamp');
    const request = index.openCursor(null, 'prev');
    const results: SavedImage[] = [];

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    request.onerror = () => reject(request.error);
  });
};

export const deleteImageFromGallery = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([IMAGES_STORE], 'readwrite');
    const store = transaction.objectStore(IMAGES_STORE);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const updateImageTags = async (id: string, newTags: string[]): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([IMAGES_STORE], 'readwrite');
    const store = transaction.objectStore(IMAGES_STORE);
    
    const getRequest = store.get(id);
    
    getRequest.onsuccess = () => {
        const item: SavedImage = getRequest.result;
        if (item) {
            item.tags = newTags;
            const putRequest = store.put(item);
            putRequest.onsuccess = () => resolve();
            putRequest.onerror = () => reject(putRequest.error);
        } else {
            reject(new Error("Image not found"));
        }
    };
    
    getRequest.onerror = () => reject(getRequest.error);
  });
};

export const clearAllImages = async (): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([IMAGES_STORE], 'readwrite');
    const store = transaction.objectStore(IMAGES_STORE);
    store.clear(); 
    
    transaction.oncomplete = () => resolve();
    transaction.onerror = (e) => reject(transaction.error);
  });
};

export const restoreGallery = async (images: SavedImage[]): Promise<void> => {
  if (!images || images.length === 0) return;
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([IMAGES_STORE], 'readwrite');
    const store = transaction.objectStore(IMAGES_STORE);
    
    transaction.oncomplete = () => resolve();
    transaction.onerror = (e) => reject(transaction.error);

    images.forEach(img => {
      try {
        store.put(img);
      } catch (e) {
        console.warn(`Failed to restore image ${img.id}`, e);
      }
    });
  });
};

// ==========================================
// WATERMARK OPERATIONS
// ==========================================

export const saveWatermark = async (watermark: Watermark): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([WATERMARKS_STORE], 'readwrite');
    const store = transaction.objectStore(WATERMARKS_STORE);
    const request = store.put(watermark);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getAllWatermarks = async (): Promise<Watermark[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([WATERMARKS_STORE], 'readonly');
    const store = transaction.objectStore(WATERMARKS_STORE);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

export const deleteWatermark = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([WATERMARKS_STORE], 'readwrite');
    const store = transaction.objectStore(WATERMARKS_STORE);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const clearAllWatermarks = async (): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([WATERMARKS_STORE], 'readwrite');
    const store = transaction.objectStore(WATERMARKS_STORE);
    store.clear();
    
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

export const restoreWatermarks = async (items: Watermark[]): Promise<void> => {
  if (!items || items.length === 0) return;
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([WATERMARKS_STORE], 'readwrite');
    const store = transaction.objectStore(WATERMARKS_STORE);
    
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);

    items.forEach(item => {
      store.put(item);
    });
  });
};

// ==========================================
// PROMPT TEMPLATE OPERATIONS (NEW)
// ==========================================

export const saveTemplate = async (template: PromptTemplate): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([TEMPLATES_STORE], 'readwrite');
    const store = transaction.objectStore(TEMPLATES_STORE);
    const request = store.put(template);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getAllTemplates = async (): Promise<PromptTemplate[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([TEMPLATES_STORE], 'readonly');
    const store = transaction.objectStore(TEMPLATES_STORE);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

export const deleteTemplateFromDB = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([TEMPLATES_STORE], 'readwrite');
    const store = transaction.objectStore(TEMPLATES_STORE);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const clearAllTemplates = async (): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([TEMPLATES_STORE], 'readwrite');
    const store = transaction.objectStore(TEMPLATES_STORE);
    store.clear();
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

export const restoreTemplates = async (items: PromptTemplate[]): Promise<void> => {
  if (!items || items.length === 0) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([TEMPLATES_STORE], 'readwrite');
    const store = transaction.objectStore(TEMPLATES_STORE);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    items.forEach(item => store.put(item));
  });
};
