export interface AIAssistRequest { goal: string; files: string[]; constraints?: string[]; }
export interface AIAssistSuggestion { summary: string; steps: string[]; riskNotes?: string[]; }
export type AIAssistService = (r: AIAssistRequest) => Promise<AIAssistSuggestion>;
