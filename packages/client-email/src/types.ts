import { UUID } from "@elizaos/core";

export interface EmailClientConfig {
    smtp: {
        host: string;
        port: number;
        secure: boolean;
        auth: {
            user: string;
            pass: string;
        };
    };
    from: string;
    templatesDir?: string;
    queue?: {
        processInterval?: number;
        maxAttempts?: number;
        retryDelay?: number;
        maxConcurrent?: number;
    };
}

export interface EmailContent {
    to: string;
    subject: string;
    text?: string;
    template?: string;
    context?: Record<string, any>;
    type?: string;
}

export interface EmailStatus {
    messageId: UUID;
    status: "pending" | "processing" | "delivered" | "failed";
    attempts: number;
    sentAt?: Date;
    deliveredAt?: Date;
    error?: string;
}

export interface ApplicationResult {
    status: "accepted" | "rejected";
    score: number;
    reviewDate: Date;
    reviewerId: string;
    applicantEmail: string;
    feedback?: string;
    strengths?: string[];
    nextSteps?: string[];
}
