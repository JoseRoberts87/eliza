import { EmailContent } from "./index";
import { EventEmitter } from "events";

export interface QueuedEmail {
    id: string;
    content: EmailContent;
    attempts: number;
    lastAttempt?: Date;
    status: "pending" | "processing" | "failed" | "completed";
    error?: string;
    createdAt: Date;
}

export interface QueueConfig {
    maxAttempts: number;
    retryDelay: number; // milliseconds
    maxConcurrent: number;
    processInterval: number; // milliseconds
}

export class QueueManager extends EventEmitter {
    private queue: Map<string, QueuedEmail> = new Map();
    private processing: boolean = false;
    private processingInterval?: NodeJS.Timeout;
    private activeCount: number = 0;
    private config: QueueConfig;

    constructor(config: Partial<QueueConfig> = {}) {
        super();
        this.config = {
            maxAttempts: config.maxAttempts || 3,
            retryDelay: config.retryDelay || 1000,
            maxConcurrent: config.maxConcurrent || 5,
            processInterval: config.processInterval || 1000,
        };
    }

    public async addToQueue(content: EmailContent): Promise<string> {
        const id = crypto.randomUUID();
        const queuedEmail: QueuedEmail = {
            id,
            content,
            attempts: 0,
            status: "pending",
            createdAt: new Date(),
        };

        this.queue.set(id, queuedEmail);
        this.emit("queued", queuedEmail);

        return id;
    }

    public getQueuedEmail(id: string): QueuedEmail | undefined {
        return this.queue.get(id);
    }

    public getAllQueuedEmails(): QueuedEmail[] {
        return Array.from(this.queue.values());
    }

    public getPendingEmails(): QueuedEmail[] {
        return this.getAllQueuedEmails().filter(
            (email) => email.status === "pending"
        );
    }

    public getFailedEmails(): QueuedEmail[] {
        return this.getAllQueuedEmails().filter(
            (email) => email.status === "failed"
        );
    }

    public async processQueue(): Promise<void> {
        if (!this.processing) {
            return;
        }

        // Don't start new processing if we're at the limit
        if (this.activeCount >= this.config.maxConcurrent) {
            return;
        }

        const pendingEmails = this.getPendingEmails();
        if (pendingEmails.length === 0) {
            return;
        }

        // Only process up to maxConcurrent - activeCount emails
        const toProcess = pendingEmails.slice(
            0,
            this.config.maxConcurrent - this.activeCount
        );

        // Process each email sequentially to maintain strict control
        for (const email of toProcess) {
            if (!this.processing) {
                break;
            }

            this.activeCount++;
            try {
                const listeners = this.listeners("process");
                if (listeners.length === 0) {
                    throw new Error("No process handler registered");
                }

                const emailToProcess = this.queue.get(email.id);
                if (!emailToProcess) {
                    this.activeCount--;
                    continue;
                }

                emailToProcess.status = "processing";
                this.emit("processing", emailToProcess);

                // Process one listener at a time
                for (const listener of listeners) {
                    await listener(emailToProcess);
                }

                emailToProcess.status = "completed";
                this.emit("completed", emailToProcess);
                this.queue.delete(email.id);
            } catch (error) {
                const emailToProcess = this.queue.get(email.id);
                if (!emailToProcess) {
                    this.activeCount--;
                    continue;
                }

                emailToProcess.attempts++;
                emailToProcess.lastAttempt = new Date();
                emailToProcess.error =
                    error instanceof Error ? error.message : String(error);

                if (emailToProcess.attempts >= this.config.maxAttempts) {
                    emailToProcess.status = "failed";
                    this.emit("failed", emailToProcess);
                    this.queue.delete(email.id);
                } else {
                    emailToProcess.status = "pending";
                    this.emit("retry", emailToProcess);
                }
            } finally {
                this.activeCount--;
            }
        }

        // Schedule next batch if we have more pending emails
        const remainingEmails = this.getPendingEmails();
        if (this.processing && remainingEmails.length > 0) {
            // If any email has attempts, it's a retry
            const hasRetries = remainingEmails.some(
                (email) => email.attempts > 0
            );
            const delay = hasRetries
                ? this.config.retryDelay
                : this.config.processInterval;

            setTimeout(() => {
                if (this.processing) {
                    this.processQueue().catch((err) => this.emit("error", err));
                }
            }, delay);
        }
    }

    public startProcessing(): void {
        if (this.processing) return;

        this.processing = true;
        if (this.processingInterval) {
            clearInterval(this.processingInterval);
            this.processingInterval = undefined;
        }

        // Initial process
        this.processQueue().catch((error) => {
            this.emit("error", error);
        });
    }

    public stopProcessing(): void {
        this.processing = false;
        if (this.processingInterval) {
            clearInterval(this.processingInterval);
            this.processingInterval = undefined;
        }
        this.activeCount = 0;
    }

    public clearQueue(): void {
        this.queue.clear();
        this.stopProcessing();
    }
}
