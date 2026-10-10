import { GoogleGenAI } from '@google/genai';
import { config } from '../config';

const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

export interface ParsedTask {
    title: string;
    description: string;
    due_date: string;
}

export class GeminiService {
    /**
     * Ovozli faylni (Base64 formatida) qabul qilib, Gemini orqali tahlil qiladi va JSON qaytaradi.
     */
    static async processAudioToTasks(audioBase64: string, mimeType: string = 'audio/ogg'): Promise<ParsedTask[]> {
        const prompt = `
            Siz aqlli assistentsiz. Foydalanuvchining ushbu ovozli xabarini eshitib, qanday vazifalar va qachonga qilinishi kerakligini aniqlang.
            Iltimos, har bir aniqlangan vazifani JSON massiv (array) formatida qaytaring.
            
            Qoidalari:
            - Agar vaqt aniq berilmagan bo'lsa (masalan "bugun kechqurun", "ertaga soat 10 da" kabi bo'lsa), hozirgi vaqtga nisbatan mos sanani ISO 8601 formatida due_date ga yozing.
            - Hozirgi vaqt: ${new Date().toISOString()}
            - Agar vaqt umuman berilmagan bo'lsa, due_date: null qiling.
        `;

        try {
            const response = await ai.models.generateContent({
                model: 'gemini-3.5-flash',
                contents: [
                    {
                        role: 'user',
                        parts: [
                            { text: prompt },
                            {
                                inlineData: {
                                    data: audioBase64,
                                    mimeType: mimeType
                                }
                            }
                        ]
                    }
                ],
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: 'OBJECT',
                        properties: {
                            tasks: {
                                type: 'ARRAY',
                                items: {
                                    type: 'OBJECT',
                                    properties: {
                                        title: { type: 'STRING' },
                                        description: { type: 'STRING' },
                                        due_date: { type: 'STRING' }
                                    },
                                    required: ['title', 'description']
                                }
                            }
                        },
                        required: ['tasks']
                    }
                }
            });

            if (!response.text) return [];
            
            const parsed = JSON.parse(response.text);
            return parsed.tasks || [];
        } catch (error: any) {
            console.error('Gemini API xatoligi:', error);
            throw new Error(`Gemini xatosi: ${error.message || error}`);
        }
    }
}
