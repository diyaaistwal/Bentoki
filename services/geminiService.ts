
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

const SYSTEM_INSTRUCTION = `
You are Bentōki — a daily execution architect.
Your role is to extract atomic, actionable tasks from unstructured user input.

### TASK EXTRACTION RULES
1. Identify individual activities.
2. Keep tasks atomic (one sitting).
3. DO NOT change, normalize, reword, or "clean up" the user's text. Keep the exact wording provided by the user for each task name.
4. Remove duplicate entries.

### OUTPUT
Return a JSON object containing an array of task names.
Do NOT estimate time. Do NOT assign priorities.
`;

export const extractTasks = async (userInput: string): Promise<string[]> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `User Input: ${userInput}`,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          task_names: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ['task_names']
      }
    }
  });

  try {
    const result = JSON.parse(response.text || '{"task_names":[]}');
    return result.task_names;
  } catch (error) {
    throw new Error("Failed to extract tasks.");
  }
};
