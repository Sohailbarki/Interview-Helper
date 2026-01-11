
import { GoogleGenAI, Type } from "@google/genai";
import { COPILOT_SYSTEM_PROMPT, MATCHER_SYSTEM_PROMPT } from "../constants";
import { Scenario } from "../types";
import { databaseService } from "./databaseService";

const callGemini = async (prompt: string, systemInstruction: string, schema?: any) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.3, // Slightly higher for better narrative flow
      },
    });

    const text = response.text;
    if (!text) return null;

    try {
      return JSON.parse(text.trim());
    } catch (e) {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]);
      throw e;
    }
  } catch (error) {
    console.error("AI Bridge Error:", error);
    return null;
  }
};

export const aiService = {
  async getLiveCopilotSuggestion(
    transcript: string,
    scenarios: Scenario[],
    company: string,
    role: string
  ): Promise<any> {
    const docs = databaseService.getDocuments();
    
    // Categorize context for better AI grounding
    const jdContext = docs.filter(d => d.type === 'JD').map(d => d.content).join('\n\n');
    const cvContext = docs.filter(d => d.type === 'CV').map(d => d.content).join('\n\n');
    const otherContext = docs.filter(d => d.type === 'Notes').map(d => d.content).join('\n\n');

    const prompt = `
TRANSCRIPT SNIPPET: 
"${transcript}"

TARGET CONTEXT:
Target Company: ${company}
Target Role: ${role}

UPLOADED JOB DESCRIPTION (JD):
${jdContext || "N/A - Use role title for general industry expectations."}

UPLOADED CANDIDATE RESUME (CV):
${cvContext || "N/A - Rely on STAR Vault below."}

ADDITIONAL CONTEXT:
${otherContext || "None."}

TASK:
1. Determine if the interviewer just asked a question (isInterviewerQuestion).
2. If so, synthesize a FIRST-PERSON STAR answer that blends the Candidate's specific experience from their CV with the requirements of the JD and Industry Best Practices.
3. Ensure the Situation is humanized and narrative-driven.
`;

    return await callGemini(prompt, COPILOT_SYSTEM_PROMPT, {
      type: Type.OBJECT,
      properties: {
        isInterviewerQuestion: { type: Type.BOOLEAN },
        detectedRole: { type: Type.STRING },
        hook: { type: Type.STRING },
        answer: { type: Type.STRING },
        bullets: { type: Type.ARRAY, items: { type: Type.STRING } },
        strategy: { type: Type.STRING }
      },
      required: ["isInterviewerQuestion", "detectedRole", "hook", "answer", "bullets", "strategy"]
    });
  }
};
