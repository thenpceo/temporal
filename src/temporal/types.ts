export type TicketPriority = "low" | "medium" | "high" | "critical";
export type AccountTier = "self-serve" | "growth" | "enterprise" | "strategic";
export type WorkflowPhase =
  | "received"
  | "enriched"
  | "classified"
  | "case_created"
  | "notified"
  | "analytics_written"
  | "investigating"
  | "drafting_reply"
  | "awaiting_approval"
  | "waiting_for_resolution"
  | "resolved";

export interface PylonTicket {
  id: string;
  customerName: string;
  requesterEmail: string;
  subject: string;
  body: string;
  priority: TicketPriority;
  createdAt: string;
  slaMinutesRemaining: number;
}

export interface SalesforceAccount {
  id: string;
  name: string;
  tier: AccountTier;
  arrBand: string;
  owner: string;
  renewalDate?: string;
  openOpportunity?: boolean;
}

export interface EscalationClassification {
  riskScore: number;
  riskLabel: "normal" | "watch" | "urgent" | "executive";
  reason: string;
  recommendedOwner: string;
  recommendedAction: string;
}

export interface ToolCallRecord {
  name: string;
  args: Record<string, string>;
  result: string;
  durationMs: number;
}

export interface InvestigationFindings {
  findings: string;
  toolCalls: number;
  toolCallDetails: ToolCallRecord[];
  durationMs: number;
  source: "llm" | "mock";
  childWorkflowId?: string;
}

export interface DraftReply {
  content: string;
  status: "pending" | "approved" | "edited";
  source: "llm" | "mock";
  approvedAt?: string;
  editedContent?: string;
}

export interface SupportEscalationInput {
  ticketId: string;
  source: "pylon" | "demo";
}

export interface TriageInvestigationInput {
  parentWorkflowId: string;
  ticket: PylonTicket;
  account: SalesforceAccount;
  classification: EscalationClassification;
}

export interface SupportEscalationState {
  workflowId: string;
  phase: WorkflowPhase;
  ticket?: PylonTicket;
  account?: SalesforceAccount;
  classification?: EscalationClassification;
  classificationSource?: "llm" | "mock";
  salesforceCaseId?: string;
  slackThreadUrl?: string;
  bigQueryEventIds: string[];
  execVisible: boolean;
  assignedOwner?: string;
  priorityOverride?: TicketPriority;
  failureNotes: string[];
  resolved: boolean;
  playbookLoaded: boolean;
  playbookSummary?: string;
  investigation?: InvestigationFindings;
  draftReply?: DraftReply;
}
