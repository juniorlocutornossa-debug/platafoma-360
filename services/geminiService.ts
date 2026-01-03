
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateVideoCaption = async (eventName: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Gere uma legenda curta, criativa e animada em português para um vídeo de 360 graus feito no evento "${eventName}". A legenda deve ser curta o suficiente para um post de rede social (máximo 10 palavras).`,
      config: {
        temperature: 0.8,
        topP: 0.95,
      },
    });
    return response.text.replace(/"/g, '') || "Momento épico no 360°!";
  } catch (error) {
    console.error("Erro ao gerar legenda:", error);
    return "Momentos inesquecíveis!";
  }
};
