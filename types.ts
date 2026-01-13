
export enum FormatType {
  STAR = 'STAR',
  CAR = 'CAR',
  LOGICAL = 'LOGICAL'
}

export interface Scenario {
  id: string;
  title: string;
  format: FormatType;
  situation: string;
  task: string;
  action: string;
  result: string;
  tags: string[];
}

export interface Document {
  id: string;
  title: string;
  type: 'CV' | 'JD' | 'Notes';
  content: string;
  createdAt: string;
}

export interface InterviewSession {
  id: string;
  company: string;
  role: string;
  jdText: string;
  notes: string;
  createdAt: string;
}

export interface SuggestedAnswer {
  hook: string;
  answer: string;
  bullets: string[];
  followup: string;
}

export interface AppSettings {
  aiProvider: 'gemini' | 'local' | 'openai';
  aiModel: string;
  asrMode: 'browser' | 'local';
  privacyMode: 'local_only' | 'cloud_allowed';
  teleprompterSpeed: number;
  fontSize: number;
  opacity: number;
  openaiApiKey?: string;
  fontFamily: 'Inter' | 'JetBrains Mono';
  synthesisWidth: number;
  footerHeight: number;
  overlayWidth: number;
}