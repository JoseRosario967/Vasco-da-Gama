
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { AspectRatio, GeneratedImageResult, ImageQuality, Recipe, GardenTips, WeatherReport, PoemResult, CropReport, GardenPlan } from "../types";

// Initialize the client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const FLASH_MODEL = 'gemini-2.5-flash-image';
const PRO_MODEL = 'gemini-3-pro-image-preview'; // High Fidelity Model
const IMAGEN_3_MODEL = 'imagen-3.0-generate-001'; // Standard High Quality
const IMAGEN_4_MODEL = 'imagen-4.0-generate-001'; // Ultra High Quality (Experimental/Private Preview)
const ANALYSIS_MODEL = 'gemini-2.5-flash';
const TTS_MODEL = 'gemini-2.5-flash-preview-tts';

/**
 * Parses the response from Gemini to extract image data or text.
 * Includes safety checks.
 */
const parseResponse = (response: GenerateContentResponse): GeneratedImageResult => {
  const candidate = response.candidates?.[0];

  if (!candidate) {
     throw new Error("A IA não retornou nenhum conteúdo. Tente novamente.");
  }

  // Check for Safety Blocks
  if (candidate.finishReason === 'SAFETY') {
     throw new Error("A geração foi bloqueada pelos filtros de segurança da Google. Tente reformular o prompt removendo termos sensíveis.");
  }

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

  // If we got here but have no content (and no safety block), throw error
  if (!imageUrl && !textOutput) {
     throw new Error("A IA processou o pedido mas não gerou imagem nem texto. Tente simplificar a instrução.");
  }

  return { imageUrl, textOutput };
};

/**
 * Helper to enhance prompt based on quality settings
 */
const enhancePrompt = (originalPrompt: string, quality: ImageQuality, negativePrompt?: string): string => {
    let finalPrompt = originalPrompt;

    if (quality === 'high') {
        finalPrompt += " . Photorealistic, 8k resolution, highly detailed, sharp focus, cinematic lighting.";
    }

    if (negativePrompt && negativePrompt.trim()) {
        finalPrompt += ` . Ensure the image does NOT contain: ${negativePrompt.trim()}.`;
    }

    return finalPrompt;
};

interface ImageInput {
    base64Data: string;
    mimeType: string;
}

/**
 * Generates an image based on a text prompt AND optional reference images.
 * STRATEGY: Imagen 4 -> Fallback to Imagen 3 -> Fallback to Gemini Pro -> Fallback to Flash
 */
export const generateImageFromText = async (
  prompt: string,
  aspectRatio: AspectRatio = "1:1",
  quality: ImageQuality = 'standard',
  negativePrompt: string = '',
  referenceImages: ImageInput[] = []
): Promise<GeneratedImageResult> => {
  try {
    const finalPrompt = enhancePrompt(prompt, quality, negativePrompt);

    // 1. HIGH QUALITY MODE (Pure Creation)
    if (quality === 'high' && referenceImages.length === 0) {
        
        // TIER 1: Try IMAGEN 4 (The "Ferrari")
        try {
            console.log("Attempting generation with Imagen 4...");
            const response = await ai.models.generateImages({
                model: IMAGEN_4_MODEL,
                prompt: finalPrompt,
                config: {
                    numberOfImages: 1,
                    aspectRatio: aspectRatio,
                    outputMimeType: 'image/jpeg'
                }
            });

            const base64 = response.generatedImages?.[0]?.image?.imageBytes;
            if (base64) {
                console.log("Success with Imagen 4!");
                return { 
                    imageUrl: `data:image/jpeg;base64,${base64}`, 
                    textOutput: null,
                    modelUsed: 'Imagen 4 (Ultra)'
                };
            }
        } catch (imagen4Error: any) {
            console.warn("Imagen 4 unavailable or failed. Falling back to Imagen 3.", imagen4Error);
            
            // TIER 2: Fallback to IMAGEN 3 (The "Porsche")
            try {
                const response = await ai.models.generateImages({
                    model: IMAGEN_3_MODEL,
                    prompt: finalPrompt,
                    config: {
                        numberOfImages: 1,
                        aspectRatio: aspectRatio,
                        outputMimeType: 'image/jpeg'
                    }
                });

                const base64 = response.generatedImages?.[0]?.image?.imageBytes;
                if (base64) {
                    console.log("Success with Imagen 3!");
                    return { 
                        imageUrl: `data:image/jpeg;base64,${base64}`, 
                        textOutput: null,
                        modelUsed: 'Imagen 3 (High)'
                    };
                }
            } catch (imagen3Error: any) {
                console.warn("Imagen 3 failed. Falling back to Gemini Pro.", imagen3Error);
                // Continue to Tier 3 (Gemini Pro) below
            }
        }
    }

    // 2. STANDARD MODE / REFERENCE IMAGE MODE (Gemini Models)
    // TIER 3: Gemini 3 Pro or Flash
    const parts: any[] = [];

    // Add Reference Images first
    if (referenceImages.length > 0) {
        referenceImages.forEach(img => {
            parts.push({
                inlineData: {
                    data: img.base64Data,
                    mimeType: img.mimeType
                }
            });
        });
    }

    // Add Text Prompt
    parts.push({ text: finalPrompt });

    // Use Pro if high quality requested (and not using Imagen), otherwise Flash
    const modelToUse = quality === 'high' ? PRO_MODEL : FLASH_MODEL;
    const imgConfig: any = { aspectRatio: aspectRatio };
    
    if (modelToUse === PRO_MODEL) {
        imgConfig.imageSize = "2K";
    }

    console.log(`Generating with fallback model: ${modelToUse}`);
    const response = await ai.models.generateContent({
      model: modelToUse,
      contents: {
        parts: parts
      },
      config: {
        imageConfig: imgConfig,
      },
    });

    const result = parseResponse(response);
    result.modelUsed = modelToUse === PRO_MODEL ? 'Gemini 3 Pro' : 'Gemini Flash';
    return result;

  } catch (error: any) {
    console.error("Gemini Generation Error:", error);
    throw new Error(error.message || "Falha ao gerar a imagem.");
  }
};

/**
 * Edits existing images based on a text prompt.
 * Uses PRO model for maximum fidelity.
 */
export const editImageWithPrompt = async (
  images: ImageInput[],
  prompt: string,
  aspectRatio: AspectRatio = "1:1",
  quality: ImageQuality = 'standard'
): Promise<GeneratedImageResult> => {
  try {
    const baseInstruction = prompt;
    
    // TEXTURE PRESERVATION PROMPT
    const finalPrompt = `
      Instructions: "${baseInstruction}"
      
      STRICT PHOTOREALISM RULES:
      1. Output a HIGH-TEXTURE photograph.
      2. PRESERVE GRAIN: Do NOT remove existing film grain or noise. The output must look like an analog photo scan.
      3. SKIN TEXTURE: Maintain pores, wrinkles, and micro-details. Do NOT smooth skin. Avoid "waxy" or "plastic" looks.
      4. IDENTITY: Keep facial features indistinguishable from the source.
      5. Do not beautify. Keep it raw and realistic.
    `;

    // Build parts array
    const parts: any[] = images.map(img => ({
        inlineData: {
            data: img.base64Data,
            mimeType: img.mimeType
        }
    }));
    
    parts.push({ text: finalPrompt });

    const response = await ai.models.generateContent({
      model: PRO_MODEL, 
      contents: {
        parts: parts,
      },
      config: {
        imageConfig: {
            imageSize: "2K" 
        },
        // Increased temperature to prevent "averaging/smoothing" effect.
        temperature: 0.55, 
        topP: 0.95
      }
    });

    const result = parseResponse(response);
    result.modelUsed = 'Gemini 3 Pro (Edit)';
    return result;
  } catch (error: any) {
    console.error("Gemini Editing Error:", error);
    throw new Error(error.message || "Falha ao editar a imagem.");
  }
};

/**
 * Creates a montage.
 */
export const createMontage = async (
  bgBase64: string,
  bgMime: string,
  fgBase64: string,
  fgMime: string,
  instructions: string
): Promise<GeneratedImageResult> => {
  try {
    const prompt = `
      Instructions: ${instructions}
      Tasks:
      1. Use FIRST image as BACKGROUND.
      2. Use SECOND image as SUBJECT.
      3. Integrate subject into background realistically.
      4. Match lighting and shadows.
    `;

    const response = await ai.models.generateContent({
      model: PRO_MODEL, // Using PRO for better blending
      contents: {
        parts: [
          { inlineData: { data: bgBase64, mimeType: bgMime } },
          { inlineData: { data: fgBase64, mimeType: fgMime } },
          { text: prompt }
        ]
      },
      config: {
        imageConfig: { imageSize: "2K" },
        temperature: 0.5
      }
    });

    const result = parseResponse(response);
    result.modelUsed = 'Gemini 3 Pro (Montage)';
    return result;
  } catch (error: any) {
    console.error("Gemini Montage Error:", error);
    throw new Error(error.message || "Falha ao criar a montagem.");
  }
};

/**
 * Restore Old Photo
 */
export const restorePhoto = async (
  imageBase64: string,
  mimeType: string
): Promise<GeneratedImageResult> => {
  try {
    const prompt = `
      Act as a professional photo restorer using high-end analog techniques.
      
      Tasks:
      1. Fix major damage (scratches, dust, tears).
      2. DO NOT DENOISE. Keep the original film grain and texture.
      3. If the face is blurry, sharpen it by adding realistic skin texture (pores), NOT by smoothing it.
      4. Avoid the "airbrushed" or "AI look". The result must look like a high-resolution scan of the original photograph.
      5. Enhance contrast and definition without losing the vintage feel.
      6. Return only the restored image.
    `;

    const response = await ai.models.generateContent({
      model: PRO_MODEL, 
      contents: {
        parts: [
          { inlineData: { data: imageBase64, mimeType: mimeType } },
          { text: prompt }
        ]
      },
      config: {
        imageConfig: {
            imageSize: "2K"
        },
        temperature: 0.55
      }
    });

    const result = parseResponse(response);
    result.modelUsed = 'Gemini 3 Pro (Restore)';
    return result;
  } catch (error: any) {
    console.error("Restoration Error:", error);
    throw new Error(error.message || "Falha ao restaurar a fotografia.");
  }
};

/**
 * Reverse Engineering
 */
export const discoverImagePrompt = async (
    base64: string,
    mimeType: string
  ): Promise<string> => {
    try {
      const prompt = `
        Act as a Prompt Engineering Expert.
        Analyze this image and write the exact TEXT PROMPT to generate it.
        Include Subject, Environment, Style, Lighting, Camera details.
        Response in English only.
      `;
  
      const response = await ai.models.generateContent({
        model: ANALYSIS_MODEL,
        contents: {
          parts: [
            { inlineData: { data: base64, mimeType: mimeType } },
            { text: prompt }
          ]
        }
      });
  
      return response.text || "Não foi possível analisar a imagem.";
    } catch (error: any) {
      console.error("Prompt Discovery Error:", error);
      throw new Error(error.message || "Falha ao descobrir o prompt.");
    }
  };

/**
 * Analyze Differences
 */
export const analyzeImageDifference = async (
    originalBase64: string,
    originalMime: string,
    editedBase64: string,
    editedMime: string
  ): Promise<string> => {
    try {
      const prompt = `
        Analisa estas duas imagens. Identifica o prompt usado para transformar a ORIGINAL na EDITADA.
        Responde APENAS com o prompt sugerido em Português.
      `;
  
      const response = await ai.models.generateContent({
        model: ANALYSIS_MODEL,
        contents: {
          parts: [
            { inlineData: { data: originalBase64, mimeType: originalMime } },
            { inlineData: { data: editedBase64, mimeType: editedMime } },
            { text: prompt }
          ]
        }
      });
  
      return response.text || "Não foi possível identificar as diferenças.";
    } catch (error: any) {
      console.error("Gemini Analysis Error:", error);
      throw new Error(error.message || "Falha ao analisar as imagens.");
    }
  };

/**
 * Chef Recipe
 */
export const generateChefRecipe = async (
  ingredientsText: string,
  restrictions: string[],
  image?: ImageInput
): Promise<Recipe> => {
  try {
    const parts: any[] = [];
    if (image) parts.push({ inlineData: { data: image.base64Data, mimeType: image.mimeType } });

    const promptText = `
      Act as a Michelin Star Chef. Create a gourmet recipe JSON.
      Ingredients: ${ingredientsText}
      Restrictions: ${restrictions.join(', ')}
      Format: {"title":"", "description":"", "ingredients":[], "steps":[], "prepTime":"", "difficulty":"", "calories":"", "chefTips":""}
    `;

    parts.push({ text: promptText });

    const response = await ai.models.generateContent({
      model: ANALYSIS_MODEL,
      contents: { parts }
    });

    const text = response.text || "{}";
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr) as Recipe;

  } catch (error: any) {
    console.error("Chef Generation Error:", error);
    throw new Error("Falha ao gerar a receita.");
  }
};

/**
 * Garden Tips (Legacy)
 */
export const generateGardenTips = async (month: string, region: string): Promise<GardenTips> => {
  try {
    const prompt = `Garden guide for ${month}, ${region}. JSON: {"sow":[], "plant":[], "harvest":[], "maintenance":[], "moonPhase":""}`;
    const response = await ai.models.generateContent({
      model: ANALYSIS_MODEL,
      contents: { parts: [{ text: prompt }] }
    });
    return JSON.parse(response.text?.replace(/```json/g, '').replace(/```/g, '').trim() || "{}") as GardenTips;
  } catch (error: any) {
    throw new Error("Falha ao gerar dicas.");
  }
};

/**
 * Garden Plan (Dashboard)
 */
export const generateGardenPlan = async (
  month: string, region: string, method: string, family: string, doubts: string, specificPlant: string = ''
): Promise<GardenPlan> => {
  try {
    const prompt = `
      Age como um Engenheiro Agrónomo Sénior especializado no clima de Portugal ("O Borda d'Água Tecnológico").
      O utilizador quer conselhos para a sua horta.
      
      DADOS DE ENTRADA:
      - Mês Atual: ${month}
      - Região: ${region}
      - Método Preferido: ${method}
      - Família de Culturas: ${family}
      - Planta Específica (Opcional): ${specificPlant || "Nenhuma"}
      - Dúvidas Específicas: ${doubts || "Nenhuma"}

      TAREFA:
      Gera um plano tático e personalizado em formato JSON.
      
      INSTRUÇÃO DE PRIORIDADE:
      Se "Planta Específica" estiver preenchido (ex: "Laranjeira", "Batatas", "Ervilhas"), IGNORA a "Família" genérica e foca TODAS as tarefas, dicas de solo e métodos EXCLUSIVAMENTE nessa planta específica. O relatório deve ser monográfico sobre essa cultura.
      Se "Planta Específica" estiver vazio, usa a "Família" para conselhos gerais.

      INSTRUÇÃO CRÍTICA DE LÍNGUA:
      Escreve todo o conteúdo (Título, Resumo, Dicas, Tarefas) EXCLUSIVAMENTE em PORTUGUÊS DE PORTUGAL (PT-PT). Não uses Espanhol.

      ESTRUTURA JSON OBRIGATÓRIA:
      {
        "title": "Título curto e motivador",
        "summary": "Resumo de 2 frases sobre o que fazer.",
        "methodAdvice": "Conselhos específicos para o método.",
        "soilTips": "Dicas de preparação de solo.",
        "tasks": ["Tarefa 1", "Tarefa 2", "Tarefa 3", "Tarefa 4"],
        "expertAnswer": "Resposta à dúvida: ${doubts}.",
        "moonPhase": "Melhor fase lunar."
      }
      
      Responde apenas com o JSON válido. Sem Markdown.
    `;

    const response = await ai.models.generateContent({
        model: ANALYSIS_MODEL,
        contents: { parts: [{ text: prompt }] }
    });

    const text = response.text || "{}";
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr) as GardenPlan;

  } catch (error: any) {
    console.error("Garden Plan Error:", error);
    throw new Error("Falha ao gerar o plano de horta.");
  }
};

/**
 * Crop Details (Encyclopedia)
 */
export const generateCropDetails = async (plantName: string): Promise<CropReport> => {
  try {
    const prompt = `
      Age como um Engenheiro Agrónomo Sénior especializado no clima de Portugal.
      Cria uma Ficha Técnica Detalhada para a cultura: "${plantName}".
      
      Para o campo "imageKeywords", fornece 3-5 palavras-chave em INGLÊS que descrevam visualmente o produto principal (ex: "red ripe tomatoes on vine close up", "orange carrot roots soil", "broad bean pods green").
      
      INSTRUÇÃO CRÍTICA DE LÍNGUA:
      O conteúdo do JSON (nomes, descrições, listas) deve estar EXCLUSIVAMENTE em PORTUGUÊS DE PORTUGAL (PT-PT). Não uses Espanhol.
      
      Responde ESTRITAMENTE em formato JSON com esta estrutura:
      {
        "name": "${plantName}",
        "scientificName": "Nome científico",
        "imageKeywords": "Palavras chave visuais em INGLÊS",
        "family": "Família botânica",
        "origin": "Origem geográfica e breve contexto histórico da planta",
        "plantingSeason": "Meses ideais para semear/plantar",
        "harvestTime": "Tempo médio até à colheita",
        "soil": { "type": "Tipo de solo", "ph": "pH ideal" },
        "water": "Necessidades hídricas",
        "sun": "Exposição solar",
        "pests": ["Praga 1", "Praga 2"],
        "diseases": ["Doença 1", "Doença 2"],
        "treatments": "Tratamentos recomendados",
        "pruning": "Instruções de poda",
        "associations": "Plantas companheiras"
      }
      Apenas JSON.
    `;

    const response = await ai.models.generateContent({
        model: ANALYSIS_MODEL,
        contents: { parts: [{ text: prompt }] }
    });

    const text = response.text || "{}";
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr) as CropReport;

  } catch (error: any) {
    console.error("Crop Details Error:", error);
    throw new Error("Falha ao gerar ficha técnica.");
  }
};

/**
 * Weather
 */
export const generateWeatherReport = async (district: string): Promise<WeatherReport> => {
  try {
    const response = await ai.models.generateContent({
        model: ANALYSIS_MODEL,
        contents: `Previsão do tempo para ${district}, Portugal.`,
        config: { tools: [{ googleSearch: {} }] }
    });
    const formatPrompt = `Baseado nisto: "${response.text}", cria JSON com linguagem popular PT: {"district":"", "currentTemp":"", "condition":"", "popularSummary":"", "hourlyForecast":[{"time":"","temp":"","icon":""}], "clothingTip":""}`;
    const formatRes = await ai.models.generateContent({ model: ANALYSIS_MODEL, contents: formatPrompt });
    return JSON.parse(formatRes.text?.replace(/```json/g, '').replace(/```/g, '').trim() || "{}") as WeatherReport;
  } catch (error: any) {
    throw new Error("Falha ao obter meteorologia.");
  }
};

/**
 * Poetry
 */
export const generatePoetry = async (topic: string, type: string, style: string): Promise<PoemResult> => {
  try {
    const prompt = `Escreve ${type} sobre ${topic}. Estilo ${style}. JSON: {"title":"", "content":"", "style":""}`;
    const response = await ai.models.generateContent({ model: ANALYSIS_MODEL, contents: prompt });
    return JSON.parse(response.text?.replace(/```json/g, '').replace(/```/g, '').trim() || "{}") as PoemResult;
  } catch (error: any) {
    throw new Error("Falha ao gerar poesia.");
  }
};

/**
 * Translation
 */
export const generateTranslation = async (text: string, targetLang: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: ANALYSIS_MODEL,
      contents: { parts: [{ text: `Traduz para ${targetLang}: "${text}"` }] }
    });
    return response.text || "Erro.";
  } catch (error: any) {
    throw new Error("Falha na tradução.");
  }
};

// --- AUDIO (TTS) ---
const createWavHeader = (dataLength: number, sampleRate: number): ArrayBuffer => {
    const buffer = new ArrayBuffer(44);
    const view = new DataView(buffer);
    view.setUint32(0, 0x52494646, false); // RIFF
    view.setUint32(4, 36 + dataLength, true);
    view.setUint32(8, 0x57415645, false); // WAVE
    view.setUint32(12, 0x666d7420, false); // fmt 
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    view.setUint32(36, 0x64617461, false); // data
    view.setUint32(40, dataLength, true);
    return buffer;
};

export const generateSpeech = async (text: string, voiceName: string = 'Kore'): Promise<Blob> => {
  try {
    const response = await ai.models.generateContent({
      model: TTS_MODEL,
      contents: { parts: [{ text: `Lê com sotaque de Portugal: ${text}` }] },
      config: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } } }
    });
    const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64) throw new Error("Sem áudio.");
    
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);

    // Audio Context Decoding
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const wavWithHeader = new Uint8Array(44 + len);
    wavWithHeader.set(new Uint8Array(createWavHeader(len, 24000)), 0);
    wavWithHeader.set(bytes, 44);
    
    const audioBuffer = await audioContext.decodeAudioData(wavWithHeader.buffer.slice(0)); 

    const offlineCtx = new OfflineAudioContext(1, audioBuffer.duration * 44100, 44100);
    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineCtx.destination);
    source.start();
    const rendered = await offlineCtx.startRendering();

    const resultLen = rendered.length * 2;
    const resultBuffer = new ArrayBuffer(44 + resultLen);
    const view = new DataView(resultBuffer);
    new Uint8Array(resultBuffer).set(new Uint8Array(createWavHeader(resultLen, 44100)), 0);
    const channel = rendered.getChannelData(0);
    let offset = 44;
    for (let i = 0; i < rendered.length; i++) {
        let s = Math.max(-1, Math.min(1, channel[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        offset += 2;
    }
    return new Blob([resultBuffer], { type: 'audio/wav' });
  } catch (e) {
    throw new Error("Falha no áudio.");
  }
};
