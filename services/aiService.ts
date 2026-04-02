
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { NARRATIVE_SYSTEM_PROMPT, STRATEGIC_LOGICAL_PROMPT, VOICE_PROFILER_PROMPT, NARRATIVE_REFINEMENT_PROMPT } from "../constants";
import { Scenario, FormatType, AppSettings } from "../types";
import { databaseService } from "./databaseService";

const getApiKey = () => {
  return process.env.API_KEY || process.env.GEMINI_API_KEY || '';
};

interface Segment {
  text: string;
  role: 'INTERVIEWER' | 'CANDIDATE' | 'UNKNOWN';
  timestamp: number;
}

const cleanJsonResponse = (text: string) => {
  if (!text) throw new Error("Empty response from AI.");
  
  // 1. Try direct parse
  try {
    return JSON.parse(text);
  } catch (e) {
    // 2. Try cleaning markdown blocks
    try {
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleaned);
    } catch (innerE) {
      // 3. Try extracting the first valid JSON object using brace matching
      const firstBrace = text.indexOf('{');
      const lastBrace = text.lastIndexOf('}');
      
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const jsonCandidate = text.substring(firstBrace, lastBrace + 1);
        try {
          return JSON.parse(jsonCandidate);
        } catch (deepE) {
          console.error("Deep parse failed for text:", text);
        }
      }
      
      throw new Error("AI response was not valid JSON. Please try again.");
    }
  }
};

const callOpenAI = async (prompt: string, systemInstruction: string, settings: AppSettings) => {
  if (!settings.openaiApiKey) {
    throw new Error("OpenAI API Key missing.");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${settings.openaiApiKey}`
    },
    body: JSON.stringify({
      model: settings.aiModel || "gpt-4o",
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
      max_tokens: 2000 
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`OpenAI Failure: ${err.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
};

const callGemini = async (prompt: string, systemInstruction: string, schema?: any, temperature: number = 0.7, thinkingLevel: ThinkingLevel = ThinkingLevel.LOW, retries: number = 2, model: string = 'gemini-3.1-pro-preview', maxOutputTokens: number = 1000) => {
  let lastError: any = null;
  
  for (let i = 0; i < retries; i++) {
    try {
      const apiKey = getApiKey();
      if (!apiKey) {
        throw new Error("Gemini API Key missing. Please select a key using the 'Select Key' button.");
      }
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: schema,
          temperature,
          maxOutputTokens, 
          thinkingConfig: { thinkingLevel } 
        },
      });

      const text = response.text;
      if (!text) throw new Error("Empty response.");
      
      return cleanJsonResponse(text);
    } catch (error: any) {
      lastError = error;
      console.warn(`Gemini Attempt ${i + 1} failed:`, error.message);
      // Wait a bit before retrying
      if (i < retries - 1) await new Promise(r => setTimeout(r, 500));
    }
  }
  
  throw lastError || new Error("Gemini failed after multiple attempts.");
};

const HOOK_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    detectedQuestion: { type: Type.STRING },
    questionType: { type: Type.STRING, description: "TECHNICAL, BEHAVIORAL, CLARIFICATION, or FOLLOW_UP" },
    isInterviewerQuestion: { type: Type.BOOLEAN },
    detectedRole: { type: Type.STRING },
    confidence: { type: Type.NUMBER },
    formatType: { type: Type.STRING },
    hook: { type: Type.STRING },
    interviewerIntent: { type: Type.STRING },
    scenarioTitle: { type: Type.STRING, description: "The title of the scenario used or articulated." }
  },
  required: ["detectedQuestion", "questionType", "isInterviewerQuestion", "detectedRole", "confidence", "formatType", "hook", "interviewerIntent", "scenarioTitle"]
};

const ANSWER_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    answer: { type: Type.STRING },
    bullets: { type: Type.ARRAY, items: { type: Type.STRING } },
    strategy: { type: Type.STRING }
  },
  required: ["answer", "bullets", "strategy"]
};

export const aiService = {
  async generateVoiceProfile(sampleTranscript: string): Promise<string> {
    try {
      const apiKey = getApiKey();
      if (!apiKey) return "Professional.";
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analyze tone: "${sampleTranscript}"`,
        config: { 
          systemInstruction: VOICE_PROFILER_PROMPT, 
          maxOutputTokens: 200,
        }
      });
      return response.text || "Professional.";
    } catch (e) {
      return "Expert.";
    }
  },

  async getLiveCopilotSuggestion(
    currentTranscript: string,
    history: Segment[],
    scenarios: Scenario[],
    company: string,
    role: string,
    preferredFormat: FormatType = FormatType.STAR,
    voiceHabits: string = "",
    settings: AppSettings,
    roleHint?: 'INTERVIEWER' | 'CANDIDATE' | null,
    usedScenarioTitles: string[] = [],
    onPartialUpdate?: (partial: any) => void,
    previousAnswer?: any,
    isFollowUpHint?: boolean
  ): Promise<any> {
    const docs = databaseService.getDocuments();
    const cvDocs = docs.filter(d => d.type === 'CV' || d.type === 'Notes').map(d => `[${d.title}]\n${d.content}`).join('\n\n').slice(0, 25000);
    const jdDocs = docs.filter(d => d.type === 'JD').map(d => `[${d.title}]\n${d.content}`).join('\n\n').slice(0, 8000);

    const chatHistory = history
      .slice(-15)
      .map(s => `${s.role}: ${s.text}`)
      .join('\n');

    const activeSystemPrompt = preferredFormat === FormatType.LOGICAL 
      ? STRATEGIC_LOGICAL_PROMPT 
      : NARRATIVE_SYSTEM_PROMPT;

    const basePrompt = `
### TARGET ROLE:
- **POSITION**: ${role} at **${company}**. 
- **LENS**: Filter all experiences through the lens of a **${role}**. Use appropriate vocabulary and technical depth.
- **UPSCALE**: If using a past role's scenario, upscale it to the level of a **${role}**.

### CONCISENESS & IMPACT:
- **EFFICIENCY**: Be detailed but avoid filler. Every sentence must provide strategic value.
- **LENGTH**: Aim for 400-500 words for deep situational grounding.

### FOLLOW-UP DETECTION:
- **STAY**: If input is a direct follow-up to the *same* scenario, provide deeper granularity.
- **MOVE**: If input is a NEW question or request for a different example, move to an UNUSED scenario.
${isFollowUpHint ? `- **HINT**: System suspects a follow-up; verify if it's the same story or a new question.` : ''}

### AI TUNING:
- **MOOD**: ${settings.aiMood}.
- **STYLE**: ${settings.responseStyle}.

### SCENARIO PROTOCOL:
1. **PRIORITY**: Use UNUSED scenarios from the Success Vault first.
2. **USED**: ${usedScenarioTitles.join(', ') || 'None'}.
3. **NO REPEAT**: Do not reuse scenarios unless exhausted.
4. **ARTICULATE**: If vault is empty/unsuitable, mine the CV to build a new STAR/CAR/Logical story.

### CONTEXT:
- Conversation: ${chatHistory}
- Latest Input: "${currentTranscript}"
${previousAnswer ? `- Previous Suggestion: "${previousAnswer.answer}"` : ''}
- Success Vault: ${JSON.stringify(scenarios.filter(s => s.title))}
- Candidate CV: ${cvDocs}
- JD/Notes: ${jdDocs}
`;

    // STAGE 1: GENERATE HOOK
    const hookPrompt = `
${basePrompt}

### STAGE 1: HOOK GENERATION
1. **DECODE INTENT**: Identify the interviewer's hidden agenda.
2. **SELECT SCENARIO**: Find the best UNUSED scenario (or articulate from CV).
3. **GENERATE HOOK**: Create a detailed 6-8 sentence opening establishing authority and complexity.
4. **OUTPUT**: Return JSON matching HOOK_SCHEMA.
`;

    const hookResult = await callGemini(hookPrompt, activeSystemPrompt, HOOK_SCHEMA, 0.7, ThinkingLevel.LOW, 2, 'gemini-3-flash-preview', 600);
    
    if (onPartialUpdate) {
      onPartialUpdate({ ...hookResult, answer: "Generating full response...", bullets: [] });
    }

    // STAGE 2: GENERATE FULL ANSWER
    const answerPrompt = `
${basePrompt}

### STAGE 2: FULL SYNTHESIS
Hook generated: "${hookResult.hook}"

1. **UPSCALE**: Flesh out the scenario with technical detail from the CV.
2. **STRUCTURE**: Generate full STAR/CAR or Logical response.
3. **DETAIL**: Provide high-stakes context in [S] and [T].
4. **OUTPUT**: Return JSON matching ANSWER_SCHEMA.
`;

    // Using Pro with LOW thinking level for Stage 2 to balance speed and quality
    const answerResult = await callGemini(answerPrompt, activeSystemPrompt, ANSWER_SCHEMA, 0.7, ThinkingLevel.LOW, 2, 'gemini-3.1-pro-preview', 1800);
    
    const finalResult = { ...hookResult, ...answerResult };
    return finalResult;
  }
};
