
import { Scenario, Document, InterviewSession } from '../types';

const STORAGE_KEYS = {
  SCENARIOS: 'coach_scenarios',
  DOCUMENTS: 'coach_documents',
  SESSIONS: 'coach_sessions',
  SETTINGS: 'coach_settings'
};

export const databaseService = {
  getScenarios: (): Scenario[] => {
    const data = localStorage.getItem(STORAGE_KEYS.SCENARIOS);
    return data ? JSON.parse(data) : [];
  },
  saveScenario: (scenario: Scenario) => {
    const scenarios = databaseService.getScenarios();
    const index = scenarios.findIndex(s => s.id === scenario.id);
    if (index > -1) {
      scenarios[index] = scenario;
    } else {
      scenarios.push(scenario);
    }
    localStorage.setItem(STORAGE_KEYS.SCENARIOS, JSON.stringify(scenarios));
  },
  deleteScenario: (id: string) => {
    const scenarios = databaseService.getScenarios().filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEYS.SCENARIOS, JSON.stringify(scenarios));
  },

  getDocuments: (): Document[] => {
    const data = localStorage.getItem(STORAGE_KEYS.DOCUMENTS);
    return data ? JSON.parse(data) : [];
  },
  saveDocument: (doc: Document) => {
    const docs = databaseService.getDocuments();
    const index = docs.findIndex(d => d.id === doc.id);
    if (index > -1) {
      docs[index] = doc;
    } else {
      docs.push(doc);
    }
    localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(docs));
  },
  deleteDocument: (id: string) => {
    const docs = databaseService.getDocuments().filter(d => d.id !== id);
    localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(docs));
  },

  getSessions: (): InterviewSession[] => {
    const data = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    return data ? JSON.parse(data) : [];
  },
  saveSession: (session: InterviewSession) => {
    const sessions = databaseService.getSessions();
    sessions.push(session);
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
  },
  
  clearAll: () => {
    localStorage.clear();
  }
};
