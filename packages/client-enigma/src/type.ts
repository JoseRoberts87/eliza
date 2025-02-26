import { Content, Memory } from "@elizaos/core";

export enum ApplicationStatus {
    RECEIVED = "received",
    FORM_COMPLETED = "form_completed",
    ADDITIONAL_QUESTIONS = "additional_questions",
    UNIQUE_FORM = "unique_form",
    SCORED = "scored",
    PENDING = "pending",
    REVIEWED = "reviewed",
    ACCEPTED = "accepted",
    REJECTED = "rejected"
}

export interface Application {
    id: string;
    companyName: string;
    createdAt: number;
    updatedAt: number;
    updatedBy: string;
    message: string;
    messageResponse: string;
    status: ApplicationStatus;
}

export interface Review {
    id: string;
    applicationId: string;
    score: number;
    feedback: string;
    createdAt: number;
    reviewerId: string;
}

export interface EnigmaConfig {
    ENIGMA_DRY_RUN?: boolean;
    ENIGMA_POLL_INTERVAL?: number;
}

export interface ApplicationAttachment {
    id: string;
    url: string;
    title: string;
    source: string;
    description: string;
    text: string;
    contentType: string;
}

export interface Submission {
    text: string;
    attachments: ApplicationAttachment[];
    source: string;
}
    