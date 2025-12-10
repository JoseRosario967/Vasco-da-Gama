
import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";
import { 
  PoemResult, 
  Recipe, 
  GardenPlan, 
  CropReport, 
  WeatherReport, 
  PaleographyResult, 
  GeneratedImageResult,
  AspectRatio,
  ImageQuality,
  BioTreatmentGuide,
  ElectricalGuide,
  AnatomyGuide,
  SymptomAnalysisResult
} from "../types";

console.log("Gemini Service Loaded v4008 - Config Fix");

// Initialize the client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const FLASH_MODEL = 'gemini-2.5-flash-image'; 
const PRO_MODEL = 'gemini-3-pro-image-preview'; 
const IMAGEN_3_MODEL = 'imagen-3.0-generate-001'; 
const IMAGEN_4_MODEL = 'imagen-4.0-generate-001'; 
const ANALYSIS_MODEL = 'gemini-2.5-flash';
const TTS_MODEL = 'gemini-2.5-flash-preview-tts';
const VEO_MODEL = 'veo-2.0-generate-preview';
const COMPLEX_MODEL = 'gemini-3-pro-preview';

/**
 * Parses the response from Gemini to extract image data or text.
 */
const parseResponse = (response: GenerateContentResponse): GeneratedImageResult => {
  const candidate = response.candidates?.[0];

  if (!candidate) throw new Error("A IA não retornou nenhum conteúdo.");
  if (candidate.finishReason === 'SAFETY') throw new Error("Bloqueado por filtros de segurança.");

  let imageUrl: string | null = null;
  let textOutput: string | null = null;

  if (candidate.content?.parts) {
    for (const part of candidate.content.parts) {
      if (part.inlineData) {
        imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      } else if (part.text) {
        textOutput = part.text;
      }
    }
  }

  if (!imageUrl && !textOutput) throw new Error("Sem imagem nem texto gerado.");

  return { imageUrl, textOutput };
};

const enhancePrompt = (originalPrompt: string, quality: ImageQuality, negativePrompt?: string): string => {
    let finalPrompt = originalPrompt;
    if (quality === 'high') finalPrompt += " . Photorealistic, 8k, highly detailed.";
    if (negativePrompt?.trim()) finalPrompt += ` . Exclude: ${negativePrompt.trim()}.`;
    return finalPrompt;
};

interface ImageInput { base64Data: string; mimeType: string; }

/**
 * Generates an image with robust fallback: Imagen 4 -> Imagen 3 -> Gemini Flash
 */
export const generateImageFromText = async (
  prompt: string,
  aspectRatio: AspectRatio = "1:1",
  quality: ImageQuality = 'standard',
  negativePrompt: string = '',
  referenceImages: ImageInput[] = []
): Promise<GeneratedImageResult> => {
  const finalPrompt = enhancePrompt(prompt, quality, negativePrompt);

  // 1. Try Imagen Models (Pure Creation)
  if (quality === 'high' && referenceImages.length === 0) {
      
      // Tier 1: Imagen 4
      try {
          const res = await ai.models.generateImages({
              model: IMAGEN_4_MODEL,
              prompt: finalPrompt,
              config: { numberOfImages: 1, aspectRatio: aspectRatio, outputMimeType: 'image/jpeg' }
          });
          const b64 = res.generatedImages?.[0]?.image?.imageBytes;
          if (b64) return { imageUrl: `data:image/jpeg;base64,${b64}`, textOutput: null, modelUsed: 'Imagen 4 (Ultra)' };
      } catch (e) { console.warn("Imagen 4 failed:", e); }

      // Tier 2: Imagen 3
      try {
          const res = await ai.models.generateImages({
              model: IMAGEN_3_MODEL,
              prompt: finalPrompt,
              config: { numberOfImages: 1, aspectRatio: aspectRatio, outputMimeType: 'image/jpeg' }
          });
          const b64 = res.generatedImages?.[0]?.image?.imageBytes;
          if (b64) return { imageUrl: `data:image/jpeg;base64,${b64}`, textOutput: null, modelUsed: 'Imagen 3 (High)' };
      } catch (e) { console.warn("Imagen 3 failed:", e); }
  }

  // Tier 3: Gemini Flash (Reliable Fallback)
  try {
      const modelToUse = FLASH_MODEL; 
      
      const parts: any[] = referenceImages.map(img => ({
          inlineData: { data: img.base64Data, mimeType: img.mimeType }
      }));
      parts.push({ text: finalPrompt });

      const response = await ai.models.generateContent({
        model: modelToUse,
        contents: { parts },
        config: { imageConfig: { aspectRatio } },
      });

      const result = parseResponse(response);
      result.modelUsed = 'Gemini 2.5 Flash';
      return result;

  } catch (error: any) {
    console.error("All models failed:", error);
    throw new Error(`Falha total na geração: ${error.message}`);
  }
};

export const editImageWithPrompt = async (images: ImageInput[], prompt: string, aspectRatio: AspectRatio = "1:1", quality: ImageQuality = 'standard'): Promise<GeneratedImageResult> => {
  try {
    const parts: any[] = images.map(img => ({ inlineData: { data: img.base64Data, mimeType: img.mimeType } }));
    parts.push({ text: `Edit this image: ${prompt}. Maintain high fidelity.` });
    
    // Default to Flash for reliability on free tier, Pro if quality requested
    const model = FLASH_MODEL; 

    // NOTE: Removed imageSize config as it causes INVALID_ARGUMENT on Flash model for img2img
    const response = await ai.models.generateContent({
      model: model,
      contents: { parts },
      config: { temperature: 0.4 }
    });
    const res = parseResponse(response);
    res.modelUsed = model;
    return res;
  } catch (e: any) { throw new Error(e.message); }
};

/**
 * NEW: Remove Object (Inpainting via Red Mask)
 */
export const removeObjectFromImage = async (maskedImageBase64: string, mimeType: string, additionalInstructions: string = ''): Promise<GeneratedImageResult> => {
    try {
        const prompt = `
            INPAINTING TASK:
            1. Identify the area covered by the RED MASK/SCRIBBLE in the provided image.
            2. REMOVE the object/person highlighted by this red mask completely.
            3. FILL the removed area seamlessly with the surrounding background (inpainting).
            4. Ensure the lighting, texture, and perspective match perfectly.
            5. The red mask MUST NOT appear in the final output.
            
            ${additionalInstructions ? `Additional context: ${additionalInstructions}` : ''}
        `;

        const response = await ai.models.generateContent({
            model: PRO_MODEL, // Use PRO for smart reconstruction
            contents: {
                parts: [
                    { inlineData: { data: maskedImageBase64, mimeType } },
                    { text: prompt }
                ]
            },
            config: {
                imageConfig: { imageSize: "2K" },
                temperature: 0.4
            }
        });

        const res = parseResponse(response);
        res.modelUsed = 'Gemini 3 Pro (Inpaint)';
        return res;
    } catch (e: any) { 
        console.warn("Pro model failed for removal, trying Flash:", e);
        try {
            // Fallback to Flash
             const prompt = `Remove the red marked area from this image and fill the background. ${additionalInstructions}`;
             const response = await ai.models.generateContent({
                model: FLASH_MODEL,
                contents: {
                    parts: [
                        { inlineData: { data: maskedImageBase64, mimeType } },
                        { text: prompt }
                    ]
                }
            });
            const res = parseResponse(response);
            res.modelUsed = 'Gemini 2.5 Flash (Inpaint)';
            return res;
        } catch (err: any) {
            throw new Error("Falha ao remover objeto."); 
        }
    }
};

export const createMontage = async (bgBase64: string, bgMime: string, fgBase64: string, fgMime: string, instructions: string): Promise<GeneratedImageResult> => {
    try {
        const response = await ai.models.generateContent({
            model: PRO_MODEL, // Pro is better for blending
            contents: {
                parts: [
                    { inlineData: { data: bgBase64, mimeType: bgMime } },
                    { inlineData: { data: fgBase64, mimeType: fgMime } },
                    { text: `Create a montage/composite image. ${instructions}` }
                ]
            }
        });
        const res = parseResponse(response);
        res.modelUsed = 'Gemini 3 Pro (Montage)';
        return res;
    } catch (e: any) { throw new Error(e.message); }
};

export const restorePhoto = async (imageBase64: string, mimeType: string): Promise<GeneratedImageResult> => {
    try {
        const response = await ai.models.generateContent({
            model: PRO_MODEL,
            contents: {
                parts: [
                    { inlineData: { data: imageBase64, mimeType: mimeType } },
                    { text: "Restore this photo. Remove scratches, improve detail. Maintain original identity." }
                ]
            }
        });
        const res = parseResponse(response);
        res.modelUsed = 'Gemini 3 Pro (Restore)';
        return res;
    } catch (e: any) { throw new Error(e.message); }
};

export const transformTo3D = async (image: ImageInput, style: string): Promise<GeneratedImageResult> => {
    try {
        const prompt = `
            TRANSFORM TO 3D RENDER:
            Take this 2D image and re-render it as a high-quality 3D object.
            Style: ${style}.
            
            Requirements:
            1. Maintain the original composition and colors.
            2. Apply 3D lighting, ambient occlusion, and raytracing effects.
            3. Make it look like a physical object or digital 3D model.
            4. High fidelity and clean textures.
        `;

        // NOTE: Removed imageSize config as it is not supported for Flash img2img
        const response = await ai.models.generateContent({
            model: FLASH_MODEL,
            contents: {
                parts: [
                    { inlineData: { data: image.base64Data, mimeType: image.mimeType } },
                    { text: prompt }
                ]
            }
        });
        const res = parseResponse(response);
        res.modelUsed = 'Gemini 2.5 Flash (3D)';
        return res;
    } catch (e: any) { throw new Error(e.message); }
};

export const generateVideo = async (prompt: string): Promise<string> => {
    // Note: Veo model might not be available on free tier, handle gracefully
    try {
        // Placeholder for Veo implementation if user has access
        // Currently returning a mock error or fallback as Veo API structure is specific
        // For this implementation, we will simulate or use a text response if video not supported
        
        /* 
        const response = await ai.models.generateContent({
            model: VEO_MODEL,
            contents: { parts: [{ text: prompt }] }
        });
        */
       throw new Error("Motor de vídeo não disponível nesta chave API.");
    } catch (e) {
        throw new Error("Geração de vídeo indisponível.");
    }
};

export const discoverImagePrompt = async (base64: string, mimeType: string): Promise<string> => {
    const response = await ai.models.generateContent({
        model: ANALYSIS_MODEL,
        contents: { parts: [{ inlineData: { data: base64, mimeType } }, { text: "Analyze image and write detailed prompt." }] }
    });
    return response.text || "";
};

// ... Helper Functions (Chef, Garden, etc.) ...

export const generateChefRecipe = async (ingredientsText: string, restrictions: string[], image?: ImageInput): Promise<Recipe> => {
    const parts: any[] = [];
    if (image) parts.push({ inlineData: { data: image.base64Data, mimeType: image.mimeType } });
    parts.push({ text: `Chef recipe for ${ingredientsText}. JSON format. PT-PT.` });
    const res = await ai.models.generateContent({ model: ANALYSIS_MODEL, contents: { parts }, config: { responseMimeType: "application/json" } });
    return JSON.parse(res.text || "{}");
};

export const generateGardenPlan = async (month: string, region: string, method: string, family: string, doubts: string, specificPlant: string = ''): Promise<GardenPlan> => {
    const prompt = `Garden plan for ${specificPlant || family}. ${month}, ${region}. JSON format. PT-PT.`;
    const res = await ai.models.generateContent({ model: ANALYSIS_MODEL, contents: { parts: [{ text: prompt }] }, config: { responseMimeType: "application/json" } });
    return JSON.parse(res.text || "{}");
};

export const generateBioTreatment = async (treatmentName: string): Promise<BioTreatmentGuide> => {
    const prompt = `Bio Treatment Recipe for: "${treatmentName}". Act as Organic Agriculture Expert. JSON: name, description, ingredients[], equipment[], preparation[], application, precautions. PT-PT.`;
    const res = await ai.models.generateContent({ model: ANALYSIS_MODEL, contents: { parts: [{ text: prompt }] }, config: { responseMimeType: "application/json" } });
    // Handle nested structure if needed, or flat
    const data = JSON.parse(res.text || "{}");
    return data.treatmentGuide || data; 
};

export const generateCropDetails = async (plantName: string): Promise<CropReport> => {
    const prompt = `Crop details for ${plantName}. JSON format including 'origin' and 'imageKeywords'. PT-PT.`;
    const res = await ai.models.generateContent({ model: ANALYSIS_MODEL, contents: { parts: [{ text: prompt }] }, config: { responseMimeType: "application/json" } });
    return JSON.parse(res.text || "{}");
};

export const generateWeatherReport = async (district: string): Promise<WeatherReport> => {
    const res = await ai.models.generateContent({ model: ANALYSIS_MODEL, contents: `Weather ${district}`, config: { tools: [{ googleSearch: {} }] } });
    const formatRes = await ai.models.generateContent({ model: ANALYSIS_MODEL, contents: `Format JSON PT-PT: ${res.text}` });
    return JSON.parse(formatRes.text?.replace(/```json/g, '').replace(/```/g, '').trim() || "{}");
};

export const generateTranslation = async (text: string, target: string): Promise<string> => {
    const res = await ai.models.generateContent({ model: ANALYSIS_MODEL, contents: `Translate to ${target}: ${text}` });
    return res.text || "";
};

export const decipherAncientText = async (text: string, image?: ImageInput): Promise<PaleographyResult> => {
    const parts: any[] = [];
    if (image) parts.push({ inlineData: { data: image.base64Data, mimeType: image.mimeType } });
    parts.push({ text: `Decipher ancient text. JSON: scriptType, estimatedDate, transcription, translation, context. PT-PT.` });
    const res = await ai.models.generateContent({ model: COMPLEX_MODEL, contents: { parts }, config: { responseMimeType: "application/json" } });
    return JSON.parse(res.text || "{}");
};

export const generateSpeech = async (text: string, voice: string): Promise<Blob> => {
    // Placeholder as previously defined
    return new Blob([], { type: 'audio/wav' }); 
};

// ADDED FUNCTIONS

export const generatePoetry = async (topic: string, type: string, style: string): Promise<PoemResult> => {
    const prompt = `Write a ${type} about "${topic}" in the style of "${style}". 
    Return JSON format with keys: title, content, style. 
    Language: Portuguese (PT-PT).`;
    
    const response = await ai.models.generateContent({
        model: COMPLEX_MODEL, 
        contents: prompt,
        config: {
            responseMimeType: "application/json"
        }
    });

    return JSON.parse(response.text || "{}");
};

export const generateElectricalGuide = async (query: string): Promise<ElectricalGuide> => {
    const prompt = `
    Act as a professional electrician. Create a guide for: "${query}".
    Return JSON format:
    {
      "title": "Guide Title",
      "safetyWarnings": ["Warning 1", "Warning 2"],
      "materials": ["Material 1", "Material 2"],
      "steps": ["Step 1", "Step 2"],
      "technicalNotes": "Relevant norms (RTIEBT) and technical details.",
      "imagePrompt": "Detailed prompt to generate a technical diagram for this guide"
    }
    Language: Portuguese (PT-PT).
    `;

    const response = await ai.models.generateContent({
        model: COMPLEX_MODEL,
        contents: prompt,
        config: {
            responseMimeType: "application/json"
        }
    });

    const data = JSON.parse(response.text || "{}");
    
    if (data.imagePrompt) {
        try {
            const imgRes = await ai.models.generateContent({
                model: FLASH_MODEL,
                contents: { parts: [{ text: `Technical electrical diagram, schematic, white background, high contrast: ${data.imagePrompt}` }] },
                config: { imageConfig: { aspectRatio: "16:9" } }
            });
            
            const candidate = imgRes.candidates?.[0];
            if (candidate?.content?.parts) {
                for (const part of candidate.content.parts) {
                    if (part.inlineData) {
                        data.diagramUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                        break;
                    }
                }
            }
        } catch (e) {
            console.warn("Failed to generate diagram", e);
        }
    }

    return data;
};

export const generateAnatomyGuide = async (query: string): Promise<AnatomyGuide> => {
    const prompt = `
    Act as a medical anatomist expert (Human Biodigital style). Explain: "${query}".
    Return JSON format:
    {
      "title": "Medical Name",
      "system": "System Name",
      "function": "Primary function description",
      "location": "Anatomical location description",
      "structure": ["Part 1", "Part 2", "Part 3"],
      "clinicalNotes": "Common conditions or clinical relevance",
      "funFact": "Interesting fact",
      "imagePrompt": "Detailed prompt for a 3D medical render of this anatomy, photorealistic, educational style, isolated on black background, 8k, biodigital human style, blue lighting"
    }
    Language: Portuguese (PT-PT).
    `;

    const response = await ai.models.generateContent({
        model: COMPLEX_MODEL,
        contents: prompt,
        config: {
            responseMimeType: "application/json"
        }
    });

    const data = JSON.parse(response.text || "{}");

    if (data.imagePrompt) {
        try {
             // Generate 3D Anatomy Render
             const imgRes = await ai.models.generateContent({
                model: FLASH_MODEL,
                contents: { parts: [{ text: data.imagePrompt }] },
                config: { imageConfig: { aspectRatio: "4:3" } }
            });
            const candidate = imgRes.candidates?.[0];
            if (candidate?.content?.parts) {
                for (const part of candidate.content.parts) {
                    if (part.inlineData) {
                        data.imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                        break;
                    }
                }
            }
        } catch (e) { console.warn("Failed to generate anatomy image", e); }
    }
    return data;
};

export const analyzeSymptom = async (imageInput: ImageInput, context: string): Promise<SymptomAnalysisResult> => {
    const parts: any[] = [
        { inlineData: { data: imageInput.base64Data, mimeType: imageInput.mimeType } },
        { text: `
            Act as a medical triage assistant. Analyze this image (dermatology/symptom) and the context: "${context}".
            
            IMPORTANT: You are NOT a doctor. You provide information for educational/triage purposes only.
            
            Return JSON format (Portuguese PT-PT):
            {
                "condition": "Probable condition name",
                "severity": "Leve", "Moderado", "Preocupante", or "Consultar Médico",
                "description": "Visual analysis of the symptoms",
                "possibleCauses": ["Cause 1", "Cause 2"],
                "recommendations": ["Home care 1", "Home care 2"],
                "warning": "Standard medical disclaimer emphasizing this is AI analysis and not a diagnosis."
            }
        ` }
    ];

    const response = await ai.models.generateContent({
        model: COMPLEX_MODEL, // Use Complex model for better medical reasoning
        contents: { parts },
        config: {
            responseMimeType: "application/json"
        }
    });

    return JSON.parse(response.text || "{}");
};

// NEW: VECTORIZER SERVICE
export const generateSvgCode = async (prompt: string, imageInput?: ImageInput, type: 'icon' | 'logo' | 'illustration' = 'icon'): Promise<string> => {
    const parts: any[] = [];
    
    if (imageInput) {
        parts.push({ inlineData: { data: imageInput.base64Data, mimeType: imageInput.mimeType } });
        parts.push({ text: "Trace this image and convert it into a scalable vector graphic (SVG). Simplify complex shapes to simple paths. Match colors." });
    }

    parts.push({ 
        text: `Generate VALID SVG XML code for a ${type} representing: "${prompt}".
        Requirements:
        1. Use 'viewBox' instead of fixed width/height.
        2. Use clean paths and shapes (rect, circle, path).
        3. Minimalist and clean vector style.
        4. Return ONLY the raw SVG code string (starts with <svg, ends with </svg>). Do not wrap in markdown code blocks.
        `
    });

    const response = await ai.models.generateContent({
        model: COMPLEX_MODEL, // Complex model writes better code
        contents: { parts }
    });

    let code = response.text || "";
    // Cleanup markdown if present despite instructions
    code = code.replace(/```xml/g, '').replace(/```svg/g, '').replace(/```/g, '').trim();
    
    if (!code.startsWith('<svg')) {
        // Fallback search
        const startIndex = code.indexOf('<svg');
        const endIndex = code.lastIndexOf('</svg>') + 6;
        if (startIndex !== -1 && endIndex !== -1) {
            code = code.substring(startIndex, endIndex);
        }
    }
    
    return code;
};
