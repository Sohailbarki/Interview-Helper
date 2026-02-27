
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
  try {
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch (innerE) {}
    }
    throw new Error("Formatting error. Retrying...");
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
      temperature: 0.1,
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

const callGemini = async (prompt: string, systemInstruction: string, schema?: any) => {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error("Gemini API Key missing. Please select a key using the 'Select Key' button.");
    }
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.1,
        maxOutputTokens: 2000, 
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } 
      },
    });

    const text = response.text;
    if (!text) throw new Error("Empty response.");
    
    return cleanJsonResponse(text);
  } catch (error) {
    console.error("Gemini Failure:", error);
    throw error;
  }
};

const NARRATIVE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    detectedQuestion: { type: Type.STRING },
    questionType: { type: Type.STRING, description: "TECHNICAL, BEHAVIORAL, CLARIFICATION, or FOLLOW_UP" },
    isInterviewerQuestion: { type: Type.BOOLEAN },
    detectedRole: { type: Type.STRING },
    confidence: { type: Type.NUMBER },
    formatType: { type: Type.STRING },
    hook: { type: Type.STRING },
    answer: { type: Type.STRING },
    bullets: { type: Type.ARRAY, items: { type: Type.STRING } },
    strategy: { type: Type.STRING },
    interviewerIntent: { type: Type.STRING },
    scenarioTitle: { type: Type.STRING, description: "The title of the scenario used or articulated." }
  },
  required: ["detectedQuestion", "questionType", "isInterviewerQuestion", "detectedRole", "confidence", "formatType", "hook", "answer", "bullets", "strategy", "interviewerIntent", "scenarioTitle"]
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
          thinkingConfig: { thinkingBudget: 0 } 
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
    usedScenarioTitles: string[] = []
  ): Promise<any> {
    const docs = databaseService.getDocuments();
    const cvDocs = docs.filter(d => d.type === 'CV' || d.type === 'Notes').map(d => `[${d.title}]\n${d.content}`).join('\n\n').slice(0, 30000);
    const jdDocs = docs.filter(d => d.type === 'JD').map(d => `[${d.title}]\n${d.content}`).join('\n\n').slice(0, 10000);

    const chatHistory = history
      .slice(-5)
      .map(s => `${s.role}: ${s.text}`)
      .join('\n');

    // Switch System Backend Prompt based on the requested output logic
    const activeSystemPrompt = preferredFormat === FormatType.LOGICAL 
      ? STRATEGIC_LOGICAL_PROMPT 
      : NARRATIVE_SYSTEM_PROMPT;

    const prompt = `
### MANDATORY COMMAND: 
Synthesize an ELITE, HUMANIZED answer using the ${preferredFormat} track. 
${roleHint ? `### ROLE LOCK ACTIVE: The current speaker is DEFINITELY the ${roleHint}. You MUST set "detectedRole" to "${roleHint}" in your JSON response. Do not attempt to detect the role yourself.` : ''}

### SCENARIO SELECTION & NO-REPEAT PROTOCOL:
1. **PRIORITY**: You MUST prioritize using STAR/CAR scenarios from the Success Vault that have NOT yet been used in this session.
2. **USED SCENARIOS**: The following scenarios have already been used:
${usedScenarioTitles.length > 0 ? usedScenarioTitles.map(t => `- ${t}`).join('\n') : 'None used yet.'}
3. **REUSE POLICY**: If and ONLY IF no unused scenarios are suitable for the question, you may reuse a previously used scenario. However, if you reuse a scenario, you MUST find a completely NEW angle, focus on a different sub-project, or inject different technical details from the CV to keep the answer fresh.
4. **SAME QUESTION**: If the same question is asked twice, you MUST NOT provide the exact same answer. Pivot to a different project or a different success token from the CV.

### CREATIVE SYNTHESIS & ARTICULATION PROTOCOL:
- **Beyond the Vault**: If no direct match exists in the Success Vault (Scenarios), or if all suitable scenarios are exhausted, you are MANDATED to "articulate" a new STAR/CAR story by mining the Candidate CV for relevant projects and technical achievements.
- **Linkage**: Explicitly link the articulated scenario to the candidate's real-world experience found in the CV.
- **Novelty**: Always aim for novelty. Use the massive detail in the CV to upscale the narrative context.

### THINKING PROTOCOL:
Before providing the JSON response, you MUST:
1. Identify the core competency being tested.
2. Scan the Success Vault for the most relevant UNUSED scenario.
3. If no suitable UNUSED scenario exists, scan for a suitable USED scenario (and plan a new angle) OR mine the CV for a fresh project to articulate.
4. Scan the CV for supporting technical and metric details to upscale the chosen story.
5. Plan how to reiterate the question and build a foundational base.

### DEEP SCAN & STRATEGIC MATCHING PROTOCOL:
You MUST perform a meticulous, word-by-word analysis of the provided CV, JD, and Scenarios. 
- **Project Cataloging**: Before synthesizing, mentally list every project and achievement found in the CV and Scenarios.
- **Identify & Prioritize**: Find the specific projects, activities, and technical achievements that most closely align with the Job Description (JD).
- **Adapt & Bridge**: If a direct match for a JD requirement isn't found in the Scenarios, select the most relevant experience from the CV and "bridge" it. Reframe the narrative to show how those transferable skills solve the specific problems outlined in the JD.
- **Interviewer Intent**: Decode the underlying competency the interviewer is testing. Explicitly state this in the "interviewerIntent" field.
- **Question Type Recognition**: Categorize the question as TECHNICAL, BEHAVIORAL, CLARIFICATION, or FOLLOW_UP. Adapt your response structure accordingly as per the system instructions.
- **Industry Standards + User Experience**: For LOGICAL answers, synthesize industry-standard practices with the candidate's specific real-world experiences.
- **Humanized Situation**: The [S] Situation must be highly specific to the project and environment found in the CV, avoiding generic cliches.
- **No Placeholders**: Use the specific metrics, tech stacks, and team dynamics found in the candidate's history.

### CONTEXT FOR REAL-TIME ADAPTATION:
- Conversation Flow:
${chatHistory}
- Latest Input (Live): "${currentTranscript}"
- Target Position: ${role} at ${company}
- Success Vault (Scenarios): ${JSON.stringify(scenarios.filter(s => s.title))}
- Candidate CV: ${cvDocs}
- JD/Notes: ${jdDocs}

### LOGICAL MODE SPECIFIC INSTRUCTIONS:
${preferredFormat === FormatType.LOGICAL ? `
- ROLE & SENIORITY: Extract the candidate's exact role and seniority from the CV. Use language that reflects that level of responsibility.
- HUMANIZATION: Use natural transitions (e.g., "The way I see it...", "In my previous environments, I've found that...") instead of robotic bullet points.
- HOOK: Create an effective, provocative opening that immediately establishes authority.
- DO NOT use STAR or CAR markers.
- DO NOT provide specific stories or anecdotes.
- PROVIDE a general professional framework grounded in the CV's technical/functional domain.
` : `
- PROVIDE a vivid, detailed STAR/CAR story.
- Use the Candidate CV to upscale the narrative context with massive detail.
`}

### RELEVANCE AUDIT:
1. Identify if this is a follow-up or a new question.
2. If [LOGICAL] mode: Provide a framework covering Behavioral Logic, Technical Implementation, and Wisdom. Root framework points in professional philosophy.
3. If [NARRATIVE] mode: Paint a massive, vivid STAR story using CV data.
4. Strictly align domain keywords to the matching CV/Vault entries.
`;

    let result;
    if (settings.aiProvider === 'openai') {
      result = await callOpenAI(prompt, activeSystemPrompt, settings);
    } else {
      result = await callGemini(prompt, activeSystemPrompt, NARRATIVE_SCHEMA);
    }

    return result;
  }
};
