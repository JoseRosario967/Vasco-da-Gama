
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { AspectRatio, GeneratedImageResult, ImageQuality, Recipe, GardenTips, WeatherReport, PoemResult, CropReport, GardenPlan } from "../types";

// Initialize the client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_NAME = 'gemini-2.5-flash-image';
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
        finalPrompt += " . Highly detailed, photorealistic, 8k resolution, cinematic lighting, sharp focus, masterpiece.";
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

    // Build parts array
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

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: parts
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio,
        },
      },
    });

    return parseResponse(response);
  } catch (error: any) {
    console.error("Gemini Generation Error:", error);
    throw new Error(error.message || "Falha ao gerar a imagem.");
  }
};

/**
 * Edits existing images based on a text prompt.
 * Supports multiple input images.
 */
export const editImageWithPrompt = async (
  images: ImageInput[],
  prompt: string,
  aspectRatio: AspectRatio = "1:1",
  quality: ImageQuality = 'standard'
  // Note: Negative prompt is typically not supported/reliable in edit mode same way as generation
): Promise<GeneratedImageResult> => {
  try {
    const enhancedPrompt = enhancePrompt(prompt, quality);
    
    // CRITICAL FIX: Explicitly tell the model to generate a new image file.
    // Without this, Gemini 2.5 often chats about the image instead of editing it.
    const finalPrompt = `Generate a new image based on the provided input and this instruction: ${enhancedPrompt}`;

    // Build parts array: [Image1, Image2, ..., Text]
    const parts: any[] = images.map(img => ({
        inlineData: {
            data: img.base64Data,
            mimeType: img.mimeType
        }
    }));
    
    parts.push({ text: finalPrompt });

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: parts,
      },
      // Config removed to allow model to infer aspect ratio from input images
    });

    return parseResponse(response);
  } catch (error: any) {
    console.error("Gemini Editing Error:", error);
    throw new Error(error.message || "Falha ao editar a imagem.");
  }
};

/**
 * Creates a montage by combining a background and a subject image.
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
      1. Use the FIRST image provided as the BACKGROUND/ENVIRONMENT.
      2. Use the SECOND image provided as the SUBJECT/OBJECT source.
      3. Seamlessly integrate the subject into the background based on the instructions.
      4. Ensure lighting, shadows, and perspective match perfectly to create a realistic montage.
      5. Output ONLY the generated image.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          { inlineData: { data: bgBase64, mimeType: bgMime } },
          { inlineData: { data: fgBase64, mimeType: fgMime } },
          { text: prompt }
        ]
      }
    });

    return parseResponse(response);
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
      Generate a restored version of this image.
      Tasks:
      1. Remove scratches, dust, and creases.
      2. Reduce noise and grain.
      3. Improve sharpness and detail (upscale).
      4. Correct fading colors or balance black and white contrast.
      5. Keep facial features realistic and faithful to the original.
      6. Return only the restored image.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          { inlineData: { data: imageBase64, mimeType: mimeType } },
          { text: prompt }
        ]
      }
    });

    return parseResponse(response);
  } catch (error: any) {
    console.error("Restoration Error:", error);
    throw new Error(error.message || "Falha ao restaurar a fotografia.");
  }
};

/**
 * Analyzes two images to find the prompt that caused the transformation.
 */
export const analyzeImageDifference = async (
    originalBase64: string,
    originalMime: string,
    editedBase64: string,
    editedMime: string
  ): Promise<string> => {
    try {
      const prompt = `
        Analisa estas duas imagens cuidadosamente.
        A primeira imagem é a ORIGINAL.
        A segunda imagem é a EDITADA.
        
        A tua tarefa é identificar qual foi o comando de texto (prompt) usado numa IA Generativa para transformar a imagem ORIGINAL na EDITADA.
        
        Sê específico sobre mudanças de estilo, objetos adicionados, iluminação ou alterações de cor.
        Responde APENAS com o prompt sugerido, em Português, sem introduções ou explicações adicionais.
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
 * Chef Michelin: Generate Recipe from Ingredients/Image
 */
export const generateChefRecipe = async (
  ingredientsText: string,
  restrictions: string[],
  image?: ImageInput
): Promise<Recipe> => {
  try {
    const parts: any[] = [];
    
    if (image) {
      parts.push({ inlineData: { data: image.base64Data, mimeType: image.mimeType } });
    }

    const promptText = `
      Act as a Michelin Star Chef.
      Analyze the provided ingredients/image and create a GOURMET recipe.
      
      Additional Ingredients Provided: ${ingredientsText}
      Dietary Restrictions: ${restrictions.join(', ')}
      
      Return the response STRICTLY in valid JSON format with this structure:
      {
        "title": "Name of the dish",
        "description": "A sophisticated description of the dish",
        "ingredients": ["List", "of", "ingredients", "with", "quantities"],
        "steps": ["Step 1", "Step 2", "etc"],
        "prepTime": "e.g. 45 mins",
        "difficulty": "Easy/Medium/Hard",
        "calories": "Approx calories",
        "chefTips": "A professional tip for plating or flavor"
      }
      Do not add markdown code blocks. Just the JSON string.
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
    throw new Error("Falha ao gerar a receita. Tente novamente.");
  }
};

/**
 * Garden Studio: Generate Tips (Legacy)
 */
export const generateGardenTips = async (
  month: string,
  region: string
): Promise<GardenTips> => {
  try {
    const prompt = `
      Age como um especialista em agricultura portuguesa ("O Borda d'Água").
      Gera um guia de cultivo para:
      Mês: ${month}
      Região de Portugal: ${region}
      
      Distingue RIGOROSAMENTE entre Semear (Sementes) e Plantar (Mudas).
      
      Responde ESTRITAMENTE em formato JSON com esta estrutura:
      {
        "sow": ["Lista de o que semear"],
        "plant": ["Lista de o que plantar"],
        "harvest": ["O que se colhe agora"],
        "maintenance": ["Tarefas de manutenção importantes"],
        "moonPhase": "Dica baseada na lua para este mês (simulada)"
      }
      Sem markdown. Apenas JSON.
    `;

    const response = await ai.models.generateContent({
      model: ANALYSIS_MODEL,
      contents: { parts: [{ text: prompt }] }
    });

    const text = response.text || "{}";
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr) as GardenTips;

  } catch (error: any) {
    console.error("Garden Generation Error:", error);
    throw new Error("Falha ao gerar dicas de jardinagem.");
  }
};

/**
 * Garden Studio: Generate Personalized Plan (New Dashboard)
 */
export const generateGardenPlan = async (
  month: string,
  region: string,
  method: 'Semear (Sementes)' | 'Plantar (Mudas)',
  family: string,
  doubts: string,
  specificPlant: string = '' // NEW: Optional specific plant override
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

      Se o método for "Semear", foca em germinação, profundidade da semente, sementeira direta vs alfobre.
      Se o método for "Plantar", foca no transplante, espaçamento e adaptação da muda.
      
      Se o utilizador colocou uma dúvida específica, responde com rigor técnico mas linguagem acessível no campo "expertAnswer".

      ESTRUTURA JSON OBRIGATÓRIA:
      {
        "title": "Título curto e motivador (ex: Guia para Laranjeiras em Novembro)",
        "summary": "Resumo de 2 frases sobre o que fazer neste mês nesta região para a cultura selecionada.",
        "methodAdvice": "Conselhos específicos para o método escolhido (${method}).",
        "soilTips": "Dicas de preparação de solo para ${specificPlant || family} na região ${region}.",
        "tasks": ["Tarefa 1", "Tarefa 2", "Tarefa 3", "Tarefa 4"],
        "expertAnswer": "Resposta à dúvida: ${doubts}. Se não houver dúvida, dá uma curiosidade sobre ${specificPlant || family}.",
        "moonPhase": "Melhor fase lunar para esta atividade este mês."
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
 * Garden Studio: Generate Detailed Crop Report (Encyclopedia)
 */
export const generateCropDetails = async (plantName: string): Promise<CropReport> => {
  try {
    const prompt = `
      Age como um Engenheiro Agrónomo Sénior especializado no clima de Portugal.
      Cria uma Ficha Técnica Detalhada para a cultura: "${plantName}".
      
      A informação deve ser rigorosa e técnica, mas acessível.
      
      Para o campo "imageKeywords", fornece 3-5 palavras-chave em INGLÊS que descrevam visualmente o produto principal (ex: "red ripe tomatoes on vine close up", "orange carrot roots soil", "broad bean pods green"). Isto servirá para gerar a imagem correta.
      
      Responde ESTRITAMENTE em formato JSON com esta estrutura:
      {
        "name": "${plantName}",
        "scientificName": "Nome científico",
        "imageKeywords": "Palavras chave visuais em INGLÊS (focadas no fruto/produto)",
        "family": "Família botânica",
        "plantingSeason": "Meses ideais para semear/plantar (em Portugal)",
        "harvestTime": "Tempo médio desde o plantio até à colheita",
        "soil": {
          "type": "Tipo de solo ideal (ex: arenoso, argiloso, rico em húmus)",
          "ph": "pH ideal"
        },
        "water": "Necessidades hídricas e frequência de rega",
        "sun": "Exposição solar necessária",
        "pests": ["Lista de pragas comuns"],
        "diseases": ["Lista de doenças comuns"],
        "treatments": "Tratamentos recomendados (biológicos/orgânicos e convencionais)",
        "pruning": "Instruções de poda (se aplicável) e época ideal",
        "associations": "Plantas companheiras (favoráveis) e antagónicas"
      }
      Não uses markdown. Apenas JSON.
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
 * Weather: Real-time Grounding + Portuguese Slang
 */
export const generateWeatherReport = async (district: string): Promise<WeatherReport> => {
  try {
    const response = await ai.models.generateContent({
        model: ANALYSIS_MODEL,
        contents: `Consulta a previsão meteorológica atual e para as próximas 24h em ${district}, Portugal.`,
        config: {
            tools: [{ googleSearch: {} }] // Activate Grounding
        }
    });

    // Second pass: Format the grounded data into JSON with personality
    const groundedText = response.text;
    const formatPrompt = `
      Baseado na seguinte informação meteorológica:
      "${groundedText}"

      Cria um relatório JSON ESTRITO com o seguinte formato, usando LINGUAGEM POPULAR PORTUGUESA (ex: "Está um briol de rachar", "Vento de levar as telhas", "Sol de pouca dura"):
      {
        "district": "${district}",
        "currentTemp": "XXºC",
        "condition": "Descrição simples",
        "popularSummary": "Resumo engraçado/popular do tempo",
        "hourlyForecast": [
           {"time": "09:00", "temp": "15ºC", "icon": "sun/cloud/rain"},
           {"time": "12:00", "temp": "18ºC", "icon": "sun/cloud/rain"},
           {"time": "15:00", "temp": "19ºC", "icon": "sun/cloud/rain"},
           {"time": "18:00", "temp": "16ºC", "icon": "sun/cloud/rain"}
        ],
        "clothingTip": "Dica de vestuário prática"
      }
      Apenas JSON.
    `;

    const formatResponse = await ai.models.generateContent({
        model: ANALYSIS_MODEL,
        contents: formatPrompt
    });

    const text = formatResponse.text || "{}";
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr) as WeatherReport;

  } catch (error: any) {
    console.error("Weather Generation Error:", error);
    throw new Error("Falha ao obter meteorologia. O serviço de pesquisa pode estar indisponível.");
  }
};

/**
 * Poetry & Music Generator
 */
export const generatePoetry = async (
  topic: string,
  type: 'Poema' | 'Letra de Música' | 'Rap' | 'Verso' | 'Prosa' | 'Texto',
  style: string
): Promise<PoemResult> => {
  try {
    const prompt = `
      Escreve um(a) ${type} sobre o tema: "${topic}".
      Estilo: ${style}.
      Língua: Português.
      
      Responde em JSON:
      {
        "title": "Um título criativo",
        "content": "O texto completo com quebras de linha (\\n)",
        "style": "${style}"
      }
    `;

    const response = await ai.models.generateContent({
        model: ANALYSIS_MODEL,
        contents: prompt
    });

    const text = response.text || "{}";
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr) as PoemResult;

  } catch (error: any) {
    console.error("Poetry Generation Error:", error);
    throw new Error("Falha ao gerar poesia.");
  }
};

/**
 * Universal Translator
 */
export const generateTranslation = async (
  text: string,
  targetLang: string
): Promise<string> => {
  try {
    const prompt = `
      Traduz o seguinte texto para ${targetLang}.
      Deteta automaticamente a língua de origem.
      
      Texto Original: "${text}"
      
      Regras:
      1. Mantém o tom e o estilo do original.
      2. Se houver gírias, adapta para equivalentes culturais em ${targetLang}.
      3. Retorna APENAS o texto traduzido, nada mais.
    `;

    const response = await ai.models.generateContent({
      model: ANALYSIS_MODEL,
      contents: { parts: [{ text: prompt }] }
    });

    return response.text || "Erro na tradução.";
  } catch (error: any) {
    console.error("Translation Error:", error);
    throw new Error("Falha ao traduzir texto.");
  }
};

// --- AUDIO UTILITIES ---

/**
 * Creates a valid WAV header for PCM data.
 * Gemini returns raw PCM at 24kHz, 16-bit, Mono.
 * Web Audio API uses 32-bit float typically, so we use AudioContext to decode/resample correctly.
 */
// Kept for reference, but main implementation below uses AudioContext for robustness
const createWavHeader = (dataLength: number, sampleRate: number): ArrayBuffer => {
    const numChannels = 1;
    const bitsPerSample = 16;
    
    const buffer = new ArrayBuffer(44);
    const view = new DataView(buffer);
  
    // RIFF identifier
    view.setUint32(0, 0x52494646, false); // "RIFF"
    // file length
    view.setUint32(4, 36 + dataLength, true);
    // RIFF type
    view.setUint32(8, 0x57415645, false); // "WAVE"
    // format chunk identifier
    view.setUint32(12, 0x666d7420, false); // "fmt "
    // format chunk length
    view.setUint32(16, 16, true);
    // sample format (1 = PCM)
    view.setUint16(20, 1, true);
    // channel count
    view.setUint16(22, numChannels, true);
    // sample rate
    view.setUint32(24, sampleRate, true);
    // byte rate (sampleRate * blockAlign)
    view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
    // block align (channel count * bytes per sample)
    view.setUint16(32, numChannels * (bitsPerSample / 8), true);
    // bits per sample
    view.setUint16(34, bitsPerSample, true);
    // data chunk identifier
    view.setUint32(36, 0x64617461, false); // "data"
    // data chunk length
    view.setUint32(40, dataLength, true);
  
    return buffer;
  };

/**
 * Text to Speech (TTS) Generator
 */
export const generateSpeech = async (text: string, voiceName: string = 'Kore'): Promise<Blob> => {
  try {
    console.log(`Generating speech using voice: ${voiceName}`);
    
    // Combine instruction into text for model compatibility
    const promptText = `Lê o seguinte texto com sotaque nativo de Portugal Europeu: ${text}`;

    const response = await ai.models.generateContent({
      model: TTS_MODEL,
      contents: {
        parts: [{ text: promptText }]
      },
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName }
          }
        }
      }
    });

    // The audio data comes in base64 PCM
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    
    if (!base64Audio) {
      throw new Error("Não foi gerado nenhum áudio.");
    }

    // Convert Base64 to ArrayBuffer
    const binaryString = atob(base64Audio);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const arrayBuffer = bytes.buffer;

    // Use Web Audio API to decode PCM data
    // Gemini 2.5 TTS typically returns 24kHz raw PCM. 
    // Browsers' AudioContext can often decode raw frames if wrapped, or we manually process.
    // However, decodeAudioData expects a file structure (wav/mp3) usually.
    // Let's wrap it in a 24kHz WAV header first to allow decodeAudioData to work.
    
    const wavWith24kHeader = new Uint8Array(44 + len);
    wavWith24kHeader.set(new Uint8Array(createWavHeader(len, 24000)), 0);
    wavWith24kHeader.set(bytes, 44);

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const audioBuffer = await audioContext.decodeAudioData(wavWith24kHeader.buffer.slice(0)); // clone to avoid detach issues

    // Now re-encode to standard 44.1kHz WAV to ensure universal playback compatibility
    const offlineCtx = new OfflineAudioContext(1, audioBuffer.duration * 44100, 44100);
    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineCtx.destination);
    source.start();
    const renderedBuffer = await offlineCtx.startRendering();

    // Export to WAV (16-bit PCM, 44.1kHz)
    const length = renderedBuffer.length * 2;
    const resultBuffer = new ArrayBuffer(44 + length);
    const view = new DataView(resultBuffer);
    
    // Write Header for 44.1kHz
    const header = createWavHeader(length, 44100);
    new Uint8Array(resultBuffer).set(new Uint8Array(header), 0);

    // Write Data (Float to Int16)
    const channelData = renderedBuffer.getChannelData(0);
    let offset = 44;
    for (let i = 0; i < renderedBuffer.length; i++) {
        let sample = Math.max(-1, Math.min(1, channelData[i]));
        sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(offset, sample, true);
        offset += 2;
    }

    return new Blob([resultBuffer], { type: 'audio/wav' });

  } catch (error: any) {
    console.error("TTS Error:", error);
    throw new Error("Falha ao gerar áudio. Tente novamente.");
  }
};
