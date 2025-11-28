
import { useState, useEffect } from 'react';
import { PromptTemplate } from '../types';
import { getAllTemplates, saveTemplate, deleteTemplateFromDB, restoreTemplates } from '../services/galleryService';

const LEGACY_STORAGE_KEY = 'nexus_prompt_templates';

export const usePromptTemplates = () => {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load from DB on mount + Migrate LocalStorage
  useEffect(() => {
    const loadData = async () => {
      try {
        let dbTemplates = await getAllTemplates();

        // Migration Check: If DB is empty but LocalStorage has data
        if (dbTemplates.length === 0) {
            const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
            if (legacy) {
                try {
                    const parsed = JSON.parse(legacy);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        console.log("Migrating templates to IndexedDB...");
                        await restoreTemplates(parsed); // Save to DB
                        dbTemplates = await getAllTemplates(); // Reload from DB
                    }
                } catch (e) {
                    console.error("Migration failed", e);
                }
                localStorage.removeItem(LEGACY_STORAGE_KEY); // Clear legacy
            } else {
                // If totally empty, set defaults
                const defaults: PromptTemplate[] = [
                    { id: '1', name: 'Realismo Cinematográfico', template: '{prompt}, cinematic lighting, 8k resolution, photorealistic, highly detailed, shot on 35mm lens, depth of field' },
                    { id: '2', name: 'Estilo Anime', template: '{prompt}, anime style, studio ghibli, vibrant colors, detailed background, cell shaded' },
                    { id: '3', name: 'Pintura a Óleo', template: 'oil painting of {prompt}, textured brushstrokes, classical art style, dramatic lighting' }
                ];
                await restoreTemplates(defaults);
                dbTemplates = defaults;
            }
        }
        
        // Sort alphabetically by default
        setTemplates(dbTemplates.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (e) {
        console.error("Failed to load templates", e);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const addTemplate = async (name: string, templateContent: string) => {
    const newTemplate: PromptTemplate = {
      id: Date.now().toString(),
      name,
      template: templateContent
    };
    
    // Optimistic update
    setTemplates(prev => [...prev, newTemplate].sort((a, b) => a.name.localeCompare(b.name)));
    
    try {
        await saveTemplate(newTemplate);
    } catch (e) {
        console.error("Failed to save template", e);
        // Rollback could happen here in a complex app
    }
  };

  const updateTemplate = async (id: string, updates: Partial<PromptTemplate>) => {
    const target = templates.find(t => t.id === id);
    if (!target) return;

    const updatedTemplate = { ...target, ...updates };
    
    setTemplates(prev => prev.map(t => t.id === id ? updatedTemplate : t));
    
    try {
        await saveTemplate(updatedTemplate);
    } catch (e) {
        console.error("Failed to update template", e);
    }
  };

  const deleteTemplate = async (id: string) => {
    setTemplates(prev => prev.filter(t => t.id !== id));
    try {
        await deleteTemplateFromDB(id);
    } catch (e) {
        console.error("Failed to delete template", e);
    }
  };

  // Reorder is visual only for now in this simple list, usually persisted by sort order fields
  // For now, we will just update state locally as sorting is A-Z by default in this implementation
  const moveTemplate = (id: string, direction: 'up' | 'down') => {
    const index = templates.findIndex(t => t.id === id);
    if (index === -1) return;

    const newTemplates = [...templates];
    if (direction === 'up' && index > 0) {
      [newTemplates[index], newTemplates[index - 1]] = [newTemplates[index - 1], newTemplates[index]];
    } else if (direction === 'down' && index < templates.length - 1) {
      [newTemplates[index], newTemplates[index + 1]] = [newTemplates[index + 1], newTemplates[index]];
    }
    setTemplates(newTemplates);
    // Note: Reordering without an 'order' field in DB means reload will reset to A-Z or ID sort.
    // Given the requirement for A-Z sorting, manual reordering is temporary.
  };

  const sortTemplatesAlphabetically = () => {
    setTemplates(prev => [...prev].sort((a, b) => a.name.localeCompare(b.name)));
  };

  return {
    templates,
    isLoading,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    moveTemplate,
    sortTemplatesAlphabetically
  };
};
