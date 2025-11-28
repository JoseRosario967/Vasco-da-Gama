
export type AspectRatio = "1:1" | "3:4" | "4:3" | "9:16" | "16:9";

export type ImageQuality = 'standard' | 'high';

export interface GeneratedImageResult {
  imageUrl: string | null;
  textOutput: string | null;
  modelUsed?: string; // New field to track which model generated the image
}

export interface AppError {
  message: string;
  details?: string;
}

export enum AppView {
  DASHBOARD = 'DASHBOARD',
  GENERATOR = 'GENERATOR',
  EDITOR = 'EDITOR',
  DISCOVERY = 'DISCOVERY',
  TEXT_EDITOR = 'TEXT_EDITOR',
  BATCH_WATERMARK = 'BATCH_WATERMARK',
  RESTORATION = 'RESTORATION', 
  LOTTERY = 'LOTTERY', 
  MONTAGE = 'MONTAGE',
  CHEF = 'CHEF',
  GARDEN = 'GARDEN',
  WEATHER = 'WEATHER',
  POETRY = 'POETRY',
  TRANSLATOR = 'TRANSLATOR'
}

export interface UploadedFile {
  file?: File; 
  previewUrl: string;
  base64Data: string;
  mimeType: string;
}

export interface EditorInitialState {
  image: UploadedFile;
  prompt: string;
}

// Watermark Types
export type WatermarkPosition = 
  'top-left' | 'top-center' | 'top-right' |
  'middle-left' | 'middle-center' | 'middle-right' |
  'bottom-left' | 'bottom-center' | 'bottom-right';

export interface Watermark {
  id: string;
  name: string;
  base64Data: string;
  previewUrl: string;
}

export interface WatermarkSettings {
  activeWatermarkId: string | null;
  opacity: number; // 0 to 100
  position: WatermarkPosition;
  scale: number; // 0.1 to 1.0 (relative to image size)
  isEnabled: boolean; // Global toggle
}

export interface AdvancedSettings {
  quality: ImageQuality;
  aspectRatio: AspectRatio;
  negativePrompt: string;
}

// Gallery Types
export interface SavedImage {
  id: string;
  base64Data: string;
  mimeType: string;
  timestamp: number;
  prompt: string;
  tags: string[];
  width?: number;
  height?: number;
}

// Prompt Templates
export interface PromptTemplate {
  id: string;
  name: string;
  template: string;
}

// Chef Types
export interface Recipe {
  title: string;
  description: string;
  ingredients: string[];
  steps: string[];
  prepTime: string;
  difficulty: string;
  calories?: string;
  chefTips: string;
}

// Garden Types
export interface GardenTips {
  sow: string[]; 
  plant: string[]; 
  harvest: string[]; 
  maintenance: string[]; 
  moonPhase: string; 
}

// New: Personalized Garden Plan
export interface GardenPlan {
  title: string;
  summary: string; // Brief overview
  methodAdvice: string; // Specific advice for Sowing vs Planting
  soilTips: string; // Based on region/family
  tasks: string[]; // Actionable steps
  expertAnswer?: string; // Answer to specific doubt if provided
  moonPhase: string;
}

// Garden Encyclopedia Type
export interface CropReport {
  name: string;
  scientificName: string;
  imageKeywords: string; 
  family: string;
  origin: string; // NEW FIELD: Origin/History
  plantingSeason: string; 
  harvestTime: string; 
  soil: {
    type: string;
    ph: string;
  };
  water: string; 
  sun: string; 
  pests: string[]; 
  diseases: string[]; 
  treatments: string; 
  pruning: string; 
  associations: string; 
}

// Weather Types
export interface WeatherReport {
  district: string;
  currentTemp: string;
  condition: string;
  popularSummary: string; 
  hourlyForecast: Array<{ time: string; temp: string; icon: string }>;
  clothingTip: string;
}

// Poetry Types
export interface PoemResult {
  title: string;
  content: string;
  style: string;
}
