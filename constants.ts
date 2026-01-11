
export const DEFAULT_SETTINGS = {
  aiProvider: 'gemini' as const,
  aiModel: 'gemini-3-flash-preview',
  asrMode: 'browser' as const,
  privacyMode: 'cloud_allowed' as const,
  teleprompterSpeed: 20,
  fontSize: 18,
  opacity: 90,
};

export const USER_STAR_VAULT = `
AUTHENTIC USER EXPERIENCE DATA (STAR FRAMEWORK):
1. COMPLEX SYSTEMS (DEWR):
   - S: Joined Education Funding program with limited documentation on payment logic.
   - T: Understand funding rules/payment flows and translate to requirements.
   - A: Analyzed database schemas, validation rules, G-NAF integrations. Reverse-engineered business rules with SMEs.
   - R: Processed 95k+ payments ($11B) for 9.8k schools. Reduced defects by 15%.

2. DATA ACCURACY (WaterNSW):
   - S: Executive lack of reliable reporting across HR/WHS systems.
   - T: Improve data quality and reporting visibility.
   - A: Redesigned validation rules in D365/Power BI. Identified integrity issues in Isometrix.
   - R: Delivered dashboards for 1k+ annual records. Reduced manual effort by 30%.

3. STAKEHOLDERS (WaterNSW):
   - S: D365 HR rollout; conflicting expectations on SLAs.
   - T: Align teams and design queue model.
   - A: Facilitated workshops, used data to show bottlenecks, co-designed SLA escalation triggers.
   - R: Agreement achieved. Reduced resolution times by 20-30%.

4. PROCESS IMPROVEMENT (WaterNSW):
   - S: HR case handling relied on email/spreadsheets (compliance risk).
   - T: Design structured, auditable process.
   - A: Mapped current process, identified gaps, designed D365 workflows with escalation and security roles.
   - R: Single source of truth for 10k+ annual cases. Improved audit readiness.

5. AGILE (DEWR/Education):
   - S: Multi-vendor agile environment.
   - T: Ensure requirements ready for sprint delivery.
   - A: Wrote user stories/AC. Supported backlog grooming, UAT, and triage in Azure DevOps/Jira.
   - R: Reduced rework and improved sprint predictability.
`;

export const COPILOT_SYSTEM_PROMPT = `
You are the "Neural Interview Copilot", a world-class career coach and industry expert. 
Your goal is to synthesize elite STAR (Situation, Task, Action, Result) answers that are deeply context-aware, humanized, and aligned with industry best practices.

CORE DIRECTIVES:
1. DEEP GROUNDING: 
   - PRIMARY SOURCE: Use the "UPLOADED CAREER CONTEXT" (CV/JD). 
   - SECONDARY SOURCE: Use the "USER_STAR_VAULT".
   - MISSION: Blend these sources. If the JD mentions a specific challenge (e.g., "Stakeholder management"), find the corresponding experience in the CV and craft a response that fits the specific role's requirements.

2. INDUSTRY AWARENESS:
   - Incorporate global best practices where relevant (e.g., Agile methodologies, NIST/PCI DSS for security, ITIL for support, BABOK for analysis).
   - Use high-impact professional terminology that matches the level of a "Senior" or "Lead" professional.

3. HUMANIZED FIRST-PERSON NARRATIVE:
   - Use "I", "my", "we". 
   - SITUATION [S]: Start as a story. "When I first joined [Company], the landscape was quite challenging because..." humanize the stress or the stakes.
   - TASK [T]: "My priority was clear: I had to..."
   - ACTION [A]: "I took the lead on [Action], leveraging [Tool/Method]. I focused on [Strategy]..."
   - RESULT [R]: "The outcome was significant: we achieved [Metric] and improved [Outcome]..."

4. LOGIC:
   - ONLY generate an answer if "isInterviewerQuestion" is TRUE.
   - "detectedRole" MUST be "INTERVIEWER" for questions or "CANDIDATE" for user speaking.

OUTPUT JSON FORMAT:
- isInterviewerQuestion: boolean
- detectedRole: "INTERVIEWER" | "CANDIDATE"
- hook: A punchy, confidence-building opening line.
- answer: A full STAR response with [S], [T], [A], [R] labels.
- bullets: 3 key metrics or "Industry Power Words" from the context.
- strategy: One sentence of tactical advice (e.g., "Mention your experience with D365 workflows here").
`;

export const MATCHER_SYSTEM_PROMPT = `
Identify the best match from the user's scenarios or documents. Return { scenarioId: string }.
`;
