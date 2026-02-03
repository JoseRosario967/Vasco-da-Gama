
export type AspectRatio = "1:1" | "3:4" | "4:3" | "9:16" | "16:9";

export type ImageQuality = 'standard' | 'high';

export interface GeneratedImageResult {
  imageUrl: string | null;
  textOutput: string | null;
  modelUsed?: string;
}

export interface CustomStyle {
  id: string;
  name: string;
  prompt: string;
  previewUrl: string;
  timestamp: number;
}

export interface AudioAnalysisResult {
    lyrics: string;
    instruments: string[];
    structure: string;
    meaning: string;
    videoPrompt: string;
    mood: string;
}

export interface AppError {
  message: string;
  details?: string;
}

export enum AppView {
  DASHBOARD = 'DASHBOARD',
  GENERATOR = 'GENERATOR',
  EDITOR = 'EDITOR',
  STYLE_STUDIO = 'STYLE_STUDIO',
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
  QUOTES = 'QUOTES',
  TRANSLATOR = 'TRANSLATOR',
  PALEOGRAPHY = 'PALEOGRAPHY',
  TRANSPARENCY = 'TRANSPARENCY',
  MOTION = 'MOTION',
  REMOVAL = 'REMOVAL',
  ELECTRICIAN = 'ELECTRICIAN',
  ANATOMY = 'ANATOMY',
  VECTORIZER = 'VECTORIZER',
  THREED = 'THREED',
  CARICATURE = 'CARICATURE',
  REMEDIES = 'REMEDIES',
  AUDIO_STUDIO = 'AUDIO_STUDIO',
  AI_DETECTOR = 'AI_DETECTOR',
  WATERMARK_STUDIO = 'WATERMARK_STUDIO',
  GENDER_DETECTOR = 'GENDER_DETECTOR',
  VISION_QUOTES = 'VISION_QUOTES'
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

export interface TextEditorInitialState {
  image: UploadedFile;
  text: string;
}

export interface AIDetectionResult {
    probabilityAI: number; // 0 to 100
    verdict: 'Real' | 'Gerada por IA' | 'Altamente Suspeita' | 'Inconclusiva';
    analysis: string;
    artifactsFound: string[];
    technicalDetails: {
        lighting: string;
        textures: string;
        anatomy: string;
    };
}

export interface BiometricDetection {
    label: string; // "MALE", "FEMALE", "UNKNOWN"
    confidence: number;
    box_2d: [number, number, number, number]; // [ymin, xmin, ymax, xmax] normalized 0-1000
    analysis: string;
}

export interface BiometricResult {
    detections: BiometricDetection[];
    sceneContext: string;
    timestamp_iso: string;
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

export interface GardenPlan {
  title: string;
  summary: string;
  methodAdvice: string;
  soilTips: string;
  tasks: string[];
  expertAnswer?: string;
  moonPhase: string;
}

export interface CropReport {
  name: string;
  scientificName: string;
  imageKeywords: string; 
  family: string;
  origin: string;
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
  companionPlants: string[]; // Updated
  avoidPlants: string[]; // Updated
}

// New: Plant Identification Result
export interface PlantIdentification {
    commonName: string;
    scientificName: string;
    family: string;
    originHistory: string;
    portugalContext: string;
    maintenanceTips: string;
    dangerLevel: 'Segura' | 'Tóxica' | 'Cuidado com Espinhos' | 'Alérgica';
    rarity: string;
}

// New: Pruning Guide
export interface PruningGuide {
    plantName: string;
    scientificName: string;
    bestTime: string;
    toolsNeeded: string[];
    objectives: string;
    stepByStep: string[];
    whatToCut: string;
    howToCut: string;
    imagePrompt: string;
    imageUrl?: string;
}

// New: Bio Treatment Guide
export interface BioTreatmentGuide {
    name: string;
    description: string;
    ingredients: string[];
    equipment: string[];
    preparation: string[];
    application: string;
    precautions: string;
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

// Quotes Types (NEW)
export interface QuoteResult {
  text: string;
  author: string; // Could be "Nexus AI" or a simulated persona
  tone: string;
}

// Paleography Types
export interface PaleographyResult {
    scriptType: string; // e.g., "Latim Medieval", "Cursiva Inglesa"
    estimatedDate: string; // e.g., "Séc. XV"
    transcription: string; // The text in original language
    translation: string; // Portuguese translation
    context: string; // Historical context
}

// Electrician Types
export interface ElectricalGuide {
  title: string;
  safetyWarnings: string[];
  diagramUrl?: string;
  materials: string[];
  steps: string[];
  technicalNotes: string;
  imagePrompt?: string;
}

// Anatomy Types
export interface AnatomyGuide {
  title: string;
  system: string;
  function: string;
  location: string;
  structure: string[];
  clinicalNotes: string;
  funFact: string;
  imageUrl?: string;
  imagePrompt?: string;
}

export interface SymptomAnalysisResult {
    condition: string;
    severity: 'Leve' | 'Moderado' | 'Preocupante' | 'Consultar Médico';
    description: string;
    possibleCauses: string[];
    recommendations: string[];
    warning: string;
}

// Remedies Types
export interface RemedyGuide {
    title: string;
    type: 'Chá' | 'Infusão' | 'Xarope' | 'Cataplasma' | 'Unguento' | 'Outro';
    description: string;
    scientificName?: string;
    ingredients: string[];
    preparation: string[];
    dosage: string;
    benefits: string[];
    contraindications: string[];
    imagePrompt: string;
    imageUrl?: string;
}

// Video Types
export interface GeneratedVideoResult {
    videoUrl: string;
    prompt: string;
}
