import { GoogleGenAI, Type } from "@google/genai";
import { GeneratedContent } from '../types';

// Initialize Gemini Client
// La clé API est injectée automatiquement via process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateCampaignDetails = async (
  title: string,
  category: string
): Promise<GeneratedContent> => {
  try {
    const prompt = `
      Tu es un expert en marketing viral pour une plateforme de cadres photo (comme Twibbonize).
      L'utilisateur crée une campagne nommée : "${title}".
      La catégorie est : "${category}".

      Tâche :
      1. Rédige une description courte, engageante et émotionnelle (max 250 caractères) qui incite les gens à utiliser ce cadre.
      2. Génère 5 hashtags pertinents et populaires (en français ou anglais selon le contexte).

      Réponds UNIQUEMENT au format JSON strict respectant ce schéma.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: {
              type: Type.STRING,
              description: "La description marketing de la campagne.",
            },
            hashtags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Liste de 5 hashtags commençant par #.",
            },
          },
          required: ["description", "hashtags"],
        },
      },
    });

    const jsonText = response.text || "{}";
    return JSON.parse(jsonText) as GeneratedContent;

  } catch (error) {
    console.error("Gemini API Error:", error);
    // Fallback en cas d'erreur (ex: quota dépassé)
    return {
      description: "Montrez votre soutien en utilisant ce cadre photo personnalisé ! #FrameFlow",
      hashtags: ["#Campagne", "#Soutien", "#Viral", "#Event", "#FrameFlow"]
    };
  }
};