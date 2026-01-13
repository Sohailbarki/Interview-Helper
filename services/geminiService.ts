
import { GoogleGenAI, Type } from "@google/genai";
import { COPILOT_SYSTEM_PROMPT, MATCHER_SYSTEM_PROMPT } from "../constants";
import { SuggestedAnswer, Scenario } from "../types";

export const geminiService = {
  async composeAnswer(
    question: string,
    scenarios: Scenario[],
    userContext: string,
    tone: string = 'confident'
  ): Promise<SuggestedAnswer | null> {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-pro-exp-02-05',
        contents: `Question: ${question}\n\nAvailable Scenarios: ${JSON.stringify(scenarios)}\n\nUser Profile Context: ${userContext}\n\nTone: ${tone}`,
        config: {
          systemInstruction: COPILOT_SYSTEM_PROMPT,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              hook: { type: Type.STRING },
              answer: { type: Type.STRING },
              bullets: { type: Type.ARRAY, items: { type: Type.STRING } },
              followup: { type: Type.STRING }
            },
            required: ["hook", "answer", "bullets", "followup"]
          }
        },
      });

      const text = response.text;
      if (!text) return null;
      return JSON.parse(text.trim());
    } catch (error) {
      console.error("Error composing answer:", error);
      return null;
    }
  },

  async matchTranscript(transcript: string, scenarios: Scenario[]): Promise<any> {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: `Transcript: ${transcript}\n\nCandidate Scenarios: ${JSON.stringify(scenarios.map(s => ({ id: s.id, title: s.title, tags: s.tags })))}`,
        config: {
          systemInstruction: MATCHER_SYSTEM_PROMPT,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              competencies: { type: Type.ARRAY, items: { type: Type.STRING } },
              recommendedScenarioIds: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["summary", "competencies", "recommendedScenarioIds"]
          }
        }
      });
      const text = response.text;
      if (!text) return null;
      return JSON.parse(text.trim());
    } catch (error) {
      console.error("Error matching transcript:", error);
      return null;
    }
  }
};
