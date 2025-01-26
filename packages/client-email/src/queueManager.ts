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
    private queue: Map<string, QueuedEmail>;
    private config: QueueConfig;
    private processing: boolean;
    private activeCount: number;
    private processingInterval?: NodeJS.Timeout;

    constructor(config: Partial<QueueConfig> = {}) {
        super();
        this.queue = new Map();
        this.config = {
            maxAttempts: config.maxAttempts || 3,
            retryDelay: config.retryDelay || 5 * 60 * 1000, // 5 minutes
            maxConcurrent: config.maxConcurrent || 5,
            processInterval: config.processInterval || 1000, // 1 second
        };
        this.processing = false;
        this.activeCount = 0;
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

        // Start processing if not already started
        if (!this.processing) {
            this.startProcessing();
        }

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

    public startProcessing(): void {
        if (this.processing) return;

        this.processing = true;
        this.processingInterval = setInterval(
            () => this.processQueue(),
            this.config.processInterval
        );
    }

    public stopProcessing(): void {
        this.processing = false;
        if (this.processingInterval) {
            clearInterval(this.processingInterval);
        }
    }

    private async processQueue(): Promise<void> {
        if (this.activeCount >= this.config.maxConcurrent) return;

        const pendingEmails = this.getPendingEmails()
            .filter((email) => {
                if (!email.lastAttempt) return true;
                return (
                    Date.now() - email.lastAttempt.getTime() >=
                    this.config.retryDelay
                );
            })
            .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

        for (const email of pendingEmails) {
            if (this.activeCount >= this.config.maxConcurrent) break;

            this.activeCount++;
            email.status = "processing";
            this.emit("processing", email);

            try {
                const listeners = this.listeners("process");
                if (listeners.length === 0) {
                    throw new Error("No process handler registered");
                }

                // Call all process handlers and wait for them to complete
                await Promise.all(listeners.map((listener) => listener(email)));

                email.status = "completed";
                this.emit("completed", email);
                this.queue.delete(email.id);
            } catch (error) {
                email.attempts++;
                email.lastAttempt = new Date();
                email.error =
                    error instanceof Error ? error.message : String(error);

                if (email.attempts >= this.config.maxAttempts) {
                    email.status = "failed";
                    this.emit("failed", email);
                } else {
                    email.status = "pending";
                    this.emit("retry", email);
                }
            } finally {
                this.activeCount--;
            }
        }
    }

    public clearQueue(): void {
        this.queue.clear();
        this.emit("cleared");
    }
}
