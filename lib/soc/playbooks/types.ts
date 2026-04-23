export type StepStatus = "pending" | "running" | "completed" | "failed" | "skipped";

export interface PlaybookStep {
  id: string;
  name: string;
  description: string;
  execute: (context: PlaybookContext) => Promise<any>;
}

export interface Playbook {
  id: string;
  name: string;
  description: string;
  steps: PlaybookStep[];
}

export interface PlaybookResult {
  playbookId: string;
  caseId: string;
  status: "success" | "partial" | "failed";
  stepResults: Record<string, any>;
  startTime: string;
  endTime: string;
}

export interface PlaybookContext {
  caseId: string;
  caseData: any;
  userId: string;
  outputs: Record<string, any>;
}
