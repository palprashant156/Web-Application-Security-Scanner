export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
export type Status = "CONFIRMED" | "POTENTIAL" | "INFO" | "NOT_DETECTED";

export interface Finding {
  id: string;
  title: string;
  category: string;
  severity: Severity;
  status: Status;
  description: string;
  impact: string;
  evidence: string;
  recommendation: string;
  affectedUrl?: string;
  affectedParameter?: string;
  scannerModule: string;
  references: string[];
  timestamp: string;
}

export interface Scan {
  id: string; // Will map to MongoDB _id as string
  target: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
  startedAt?: string;
  completedAt?: string;
  score?: number;
  severitySummary?: {
    CRITICAL: number;
    HIGH: number;
    MEDIUM: number;
    LOW: number;
    INFO: number;
  };
  requestStatistics?: {
    totalRequests: number;
  };
  crawlerStats?: any;
  findings: Finding[]; // Or just finding IDs if we don't populate
  error?: string;
}
