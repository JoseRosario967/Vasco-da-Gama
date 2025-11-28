
import { getAllImages, clearAllImages, restoreGallery, getAllWatermarks, clearAllWatermarks, restoreWatermarks, getAllTemplates, clearAllTemplates, restoreTemplates } from "./galleryService";
import { Watermark, WatermarkSettings, SavedImage, PromptTemplate } from "../types";

interface BackupData {
  version: number;
  timestamp: number;
  watermarks: Watermark[];
  watermarkSettings: WatermarkSettings | null;
  gallery: SavedImage[];
  templates?: PromptTemplate[]; 
}

const BACKUP_VERSION = 3; 

/**
 * Collects all app data from IndexedDB and LocalStorage
 */
export const exportData = async (): Promise<void> => {
  try {
    // 1. Collect Data (Now templates come from DB too)
    const gallery = await getAllImages();
    const watermarks = await getAllWatermarks();
    const templates = await getAllTemplates();
    
    // Settings still from LocalStorage (small config)
    const settingsStr = localStorage.getItem('nexus_watermark_settings');
    const watermarkSettings = settingsStr ? JSON.parse(settingsStr) : null;

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
            (!validatedData.templates || validatedData.templates.length === 0)) {
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
 */
export const restoreBackup = async (data: BackupData): Promise<void> => {
  try {
    console.log("Starting restore process...", data);

    // 1. Clear Data in DBs
    localStorage.removeItem('nexus_watermarks'); 
    localStorage.removeItem('nexus_prompt_templates'); // Clean legacy
    
    await clearAllImages();
    await clearAllWatermarks();
    await clearAllTemplates(); // Clear DB templates
    console.log("Databases cleared.");

    // 2. Restore Settings
    if (data.watermarkSettings) {
      try {
        localStorage.setItem('nexus_watermark_settings', JSON.stringify(data.watermarkSettings));
      } catch (e) {
        console.warn("Could not restore watermark settings", e);
      }
    }

    // 3. Restore Templates (To IndexedDB now)
    if (data.templates && Array.isArray(data.templates)) {
        console.log(`Restoring ${data.templates.length} templates to DB...`);
        await restoreTemplates(data.templates);
    }

    // 4. Restore Watermarks
    if (data.watermarks && data.watermarks.length > 0) {
      console.log(`Restoring ${data.watermarks.length} watermarks to IndexedDB...`);
      await restoreWatermarks(data.watermarks);
    }

    // 5. Restore Gallery
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
