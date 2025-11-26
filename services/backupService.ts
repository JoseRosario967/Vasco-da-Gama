
import { getAllImages, clearAllImages, restoreGallery, getAllWatermarks, clearAllWatermarks, restoreWatermarks } from "./galleryService";
import { Watermark, WatermarkSettings, SavedImage, PromptTemplate } from "../types";

interface BackupData {
  version: number;
  timestamp: number;
  watermarks: Watermark[];
  watermarkSettings: WatermarkSettings | null;
  gallery: SavedImage[];
  templates?: PromptTemplate[]; // Added Templates field
}

const BACKUP_VERSION = 2; // Bumped version

/**
 * Collects all app data from IndexedDB and LocalStorage
 */
export const exportData = async (): Promise<void> => {
  try {
    // 1. Collect Data
    const gallery = await getAllImages();
    const watermarks = await getAllWatermarks(); // Now from DB
    
    // Settings from LocalStorage
    const settingsStr = localStorage.getItem('nexus_watermark_settings');
    const watermarkSettings = settingsStr ? JSON.parse(settingsStr) : null;

    // Templates from LocalStorage
    const templatesStr = localStorage.getItem('nexus_prompt_templates');
    const templates = templatesStr ? JSON.parse(templatesStr) : [];

    // 2. Check if empty
    if (gallery.length === 0 && watermarks.length === 0 && templates.length === 0) {
      throw new Error("Não existem dados para exportar.");
    }

    // 3. Compile JSON
    const backup: BackupData = {
      version: BACKUP_VERSION,
      timestamp: Date.now(),
      watermarks,
      watermarkSettings,
      gallery,
      templates
    };

    // 4. Download
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const date = new Date();
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    
    link.href = url;
    link.download = `ia-gerador-backup-${dateStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

  } catch (error: any) {
    console.error("Export failed:", error);
    throw error;
  }
};

/**
 * Validates the backup file structure.
 */
export const validateBackupFile = async (file: File): Promise<BackupData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        
        if (typeof json !== 'object' || json === null) {
             throw new Error("O ficheiro não contém um objeto JSON válido.");
        }

        const validatedData: BackupData = {
            version: json.version || 1,
            timestamp: json.timestamp || Date.now(),
            gallery: Array.isArray(json.gallery) ? json.gallery : [],
            watermarks: Array.isArray(json.watermarks) ? json.watermarks : [],
            watermarkSettings: json.watermarkSettings || null,
            templates: Array.isArray(json.templates) ? json.templates : []
        };

        if (validatedData.gallery.length === 0 && 
            validatedData.watermarks.length === 0 && 
            validatedData.templates?.length === 0) {
            throw new Error("O ficheiro de backup parece estar vazio.");
        }
        
        resolve(validatedData);
      } catch (err: any) {
        console.error("Validation Error:", err);
        reject(new Error(err.message || "Erro ao ler o ficheiro de backup (JSON inválido)."));
      }
    };
    reader.onerror = () => reject(new Error("Erro de leitura do ficheiro."));
    reader.readAsText(file);
  });
};

/**
 * Destructively restores data from backup.
 * Handles migration from LocalStorage to IndexedDB if needed.
 */
export const restoreBackup = async (data: BackupData): Promise<void> => {
  try {
    console.log("Starting restore process...", data);

    // 1. Clear Data
    localStorage.removeItem('nexus_watermarks'); // Legacy cleanup
    await clearAllImages();
    await clearAllWatermarks();
    console.log("Databases cleared.");

    // 2. Restore Settings (Small data stays in localStorage)
    if (data.watermarkSettings) {
      try {
        localStorage.setItem('nexus_watermark_settings', JSON.stringify(data.watermarkSettings));
      } catch (e) {
        console.warn("Could not restore watermark settings (Quota Exceeded?)", e);
      }
    }

    // 3. Restore Templates (LocalStorage)
    if (data.templates && data.templates.length > 0) {
        console.log(`Restoring ${data.templates.length} templates...`);
        try {
            localStorage.setItem('nexus_prompt_templates', JSON.stringify(data.templates));
        } catch (e) {
            console.warn("Could not restore prompt templates (Quota Exceeded?)", e);
            // In a real app, we might want to alert the user here
        }
    }

    // 4. Restore Watermarks (To IndexedDB)
    if (data.watermarks && data.watermarks.length > 0) {
      console.log(`Restoring ${data.watermarks.length} watermarks to IndexedDB...`);
      await restoreWatermarks(data.watermarks);
    }

    // 5. Restore Gallery (To IndexedDB)
    if (data.gallery && data.gallery.length > 0) {
      console.log(`Restoring ${data.gallery.length} images to IndexedDB...`);
      await restoreGallery(data.gallery);
    }
    
    console.log("Restore completed successfully.");

  } catch (error: any) {
    console.error("Restore failed:", error);
    throw new Error(`Falha ao restaurar dados: ${error.message || 'Erro desconhecido'}`);
  }
};
