
import { GoogleGenAI, Type } from "@google/genai";
import { COPILOT_SYSTEM_PROMPT, VOICE_PROFILER_PROMPT } from "../constants";
import { Scenario, FormatType, AppSettings } from "../types";
import { databaseService } from "./databaseService";

/**
 * Sanitize string for HTTP headers to prevent ISO-8859-1 errors
 */
const sanitizeHeaderValue = (value: string): string => {
  return value.trim().replace(/[^\x00-\x7F]/g, "");
};

const cleanJsonResponse = (text: string) => {
  try {
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch (innerE) {}
    }
    console.error("Critical JSON Parse Failure:", text);
    throw new Error("AI engine failed to produce valid JSON. Please retry.");
  }
};

const callGemini = async (prompt: string, systemInstruction: string, schema?: any) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.1, 
      },
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from Gemini");
    return cleanJsonResponse(text);
  } catch (error) {
    console.error("Gemini Bridge Error:", error);
    throw error;
  }
};

const callOpenAI = async (prompt: string, systemInstruction: string, apiKey: string, model: string = 'gpt-4o') => {
  try {
    if (!apiKey) throw new Error("OpenAI API Key is missing. Configure in Settings.");
    
    // Sanitize API Key to prevent header encoding errors
    const safeKey = sanitizeHeaderValue(apiKey);
    
    // Safety check: if the model name contains 'gemini', it's likely a misconfiguration
    const modelToUse = model.toLowerCase().includes('gemini') ? 'gpt-4o' : model;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${safeKey}`
      },
      body: JSON.stringify({
        model: modelToUse,
        messages: [
          { role: 'system', content: systemInstruction + "\nSTRICT RULE: Output strictly valid JSON. Ground every response in the provided CV and scenarios." },
          { role: 'user', content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({ error: { message: `HTTP Error ${response.status}` } }));
      throw new Error(errData.error?.message || `Inference Service Error: ${response.status}`);
    }

    const data = await response.json();
    return cleanJsonResponse(data.choices[0].message.content);
  } catch (error) {
    console.error("OpenAI Bridge Error:", error);
    throw error;
  }
};

export const aiService = {
  async generateVoiceProfile(sampleTranscript: string): Promise<string> {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: `Analyze linguistic fingerprint: "${sampleTranscript}"`,
        config: { systemInstruction: VOICE_PROFILER_PROMPT }
      });
      return response.text || "Professional speaking style.";
    } catch (e) {
      return "General high-level professional tone.";
    }
  },

  async getLiveCopilotSuggestion(
    transcript: string,
    scenarios: Scenario[],
    company: string,
    role: string,
    preferredFormat: FormatType = FormatType.STAR,
    voiceHabits: string = "",
    settings: AppSettings,
    roleHint?: 'INTERVIEWER' | 'CANDIDATE' | null
  ): Promise<any> {
    const docs = databaseService.getDocuments();
    const cvContext = docs.filter(d => d.type === 'CV').map(d => d.content).join('\n\n');
    const jdContext = docs.filter(d => d.type === 'JD').map(d => d.content).join('\n\n');

    const prompt = `
### SESSION METADATA
Company: ${company}
Target Role: ${role}
${roleHint ? `USER OVERRIDE: The current speaker is explicitly flagged as the ${roleHint}.` : 'DETECT speaker role automatically based on context.'}

### DATA INPUTS (GROUNDING SOURCE)
[FULL JOB DESCRIPTION]
${jdContext.slice(0, 8000)}

[FULL CANDIDATE CV/CONTEXT]
${cvContext.slice(0, 10000)}

[PRE-PREPARED SCENARIOS (USE AS PRIMARY EVIDENCE)]
${JSON.stringify(scenarios)}

[CANDIDATE VOICE FINGERPRINT]
${voiceHabits || "Professional, authoritative."}

### LIVE INPUT FRAGMENT
"${transcript}"

### MISSION
1. Analyze the 'LIVE INPUT FRAGMENT'.
2. If it is an INTERVIEWER QUESTION (or if user explicitly locked role to INTERVIEWER):
   - Identify the core competency being tested.
   - Search the 'PRE-PREPARED SCENARIOS' and 'CANDIDATE CV' for the most relevant evidence.
   - Synthesize a response in '${preferredFormat}' format.
   - **CRITICAL**: The 'hook' must follow the new "HOOK ARCHITECTURE" rules. It must be a 2-3 sentence strategic opening with a smooth transitional bridge to the STAR/CAR answer.
   - YOU MUST DEMARCATE USING [S], [T], [A], [R] or [C], [A], [R].
3. Ensure the result is strictly JSON.
`;

    if (settings.aiProvider === 'openai') {
      return await callOpenAI(prompt, COPILOT_SYSTEM_PROMPT, settings.openaiApiKey || '', settings.aiModel);
    }

    return await callGemini(prompt, COPILOT_SYSTEM_PROMPT, {
      type: Type.OBJECT,
      properties: {
        isInterviewerQuestion: { type: Type.BOOLEAN },
        detectedRole: { type: Type.STRING },
        confidence: { type: Type.NUMBER },
        formatType: { type: Type.STRING },
        hook: { type: Type.STRING },
        answer: { type: Type.STRING },
        bullets: { type: Type.ARRAY, items: { type: Type.STRING } },
        strategy: { type: Type.STRING }
      },
      required: ["isInterviewerQuestion", "detectedRole", "confidence", "formatType", "hook", "answer", "bullets", "strategy"]
    });
  }
};
