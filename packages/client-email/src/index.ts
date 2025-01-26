import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import EmailTemplates from "email-templates";
import path from "path";
import {
    IAgentRuntime,
    Memory,
    Content,
    UUID,
    HandlerCallback,
    State,
} from "@elizaos/core";
import { QueueManager, QueueConfig } from "./queueManager";

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
    queue?: Partial<QueueConfig>;
}

export interface EmailContent extends Content {
    subject: string;
    to: string;
    template?: string;
    context?: Record<string, any>;
}

export interface EmailTrackingInfo {
    messageId: string;
    status: "delivered" | "failed" | "pending";
    attempts: number;
    sentAt?: Date;
    deliveredAt?: Date;
    error?: string;
}

export class EmailClient {
    private transporter: Transporter;
    private emailTemplates: EmailTemplates;
    private config: EmailClientConfig;
    private runtime: IAgentRuntime;
    private queueManager: QueueManager;
    private trackingMap: Map<string, EmailTrackingInfo> = new Map();

    constructor(config: EmailClientConfig, runtime: IAgentRuntime) {
        this.config = config;
        this.runtime = runtime;
        this.transporter = nodemailer.createTransport(config.smtp);

        this.emailTemplates = new EmailTemplates({
            views: {
                root:
                    config.templatesDir ||
                    path.join(process.cwd(), "templates"),
                options: {
                    extension: "hbs",
                },
            },
        });

        this.queueManager = new QueueManager(config.queue);
        this.setupQueueHandlers();
    }

    private setupQueueHandlers(): void {
        this.queueManager.on("process", async (queuedEmail) => {
            let html: string;
            const content = queuedEmail.content;

            if (content.template) {
                html = await this.emailTemplates.render(
                    content.template,
                    content.context || {}
                );
            } else {
                html = content.text || "";
            }

            const mailOptions = {
                from: this.config.from,
                to: content.to,
                subject: content.subject,
                text: content.text,
                html,
            };

            const info = await this.transporter.sendMail(mailOptions);

            // Create a memory of the sent email
            const memory: Memory = {
                id: info.messageId as UUID,
                userId: this.runtime.agentId,
                agentId: this.runtime.agentId,
                roomId: content.to as UUID,
                content: {
                    ...content,
                    text: `Email sent: ${content.subject}\nTo: ${content.to}\n${content.text}`,
                },
                createdAt: Date.now(),
            };

            await this.runtime.messageManager.createMemory(memory);

            await this.updateEmailStatus(info.messageId, {
                status: "delivered",
                deliveredAt: new Date(),
                sentAt: new Date(),
            });
        });

        // Log events
        this.queueManager.on("queued", (email) => {
            console.log(`Email queued: ${email.id}`);
        });

        this.queueManager.on("processing", (email) => {
            console.log(`Processing email: ${email.id}`);
        });

        this.queueManager.on("completed", (email) => {
            console.log(`Email sent successfully: ${email.id}`);
        });

        this.queueManager.on("failed", (email) => {
            console.error(
                `Email failed after ${email.attempts} attempts: ${email.id}`,
                email.error
            );
        });

        this.queueManager.on("retry", (email) => {
            console.log(
                `Retrying email: ${email.id} (Attempt ${email.attempts})`
            );
        });
    }

    public async sendEmail(content: EmailContent): Promise<Memory> {
        let currentQueueId = "";
        try {
            currentQueueId = await this.queueManager.addToQueue(content);

            // Wait for the email to be processed
            return new Promise((resolve, reject) => {
                const checkStatus = () => {
                    const queuedEmail =
                        this.queueManager.getQueuedEmail(currentQueueId);
                    if (!queuedEmail) {
                        // Email was removed from queue, meaning it was sent successfully
                        resolve({
                            id: currentQueueId as UUID,
                            userId: this.runtime.agentId,
                            agentId: this.runtime.agentId,
                            roomId: content.to as UUID,
                            content,
                            createdAt: Date.now(),
                        });
                    } else if (queuedEmail.status === "failed") {
                        reject(
                            new Error(
                                queuedEmail.error || "Failed to send email"
                            )
                        );
                    } else {
                        // Check again in 100ms
                        setTimeout(checkStatus, 100);
                    }
                };

                // Start checking status
                checkStatus();
            });
        } catch (error) {
            const emailId =
                (content as { messageId?: string }).messageId ||
                currentQueueId ||
                "";
            await this.updateEmailStatus(emailId, {
                status: "failed",
                error: error.message,
            });
            throw error;
        }
    }

    public async handleMessage(
        message: Memory,
        _state: State,
        callback: HandlerCallback
    ): Promise<void> {
        const content = message.content as EmailContent;

        if (!content.to || !content.subject) {
            throw new Error('Email requires "to" and "subject" fields');
        }

        await this.sendEmail(content);
        await callback({ text: "Email sent successfully" });
    }

    // Queue management methods
    public getQueueStatus() {
        return {
            pending: this.queueManager.getPendingEmails().length,
            failed: this.queueManager.getFailedEmails().length,
            total: this.queueManager.getAllQueuedEmails().length,
        };
    }

    public retryFailedEmails() {
        const failedEmails = this.queueManager.getFailedEmails();
        failedEmails.forEach((email) => {
            email.status = "pending";
            email.attempts = 0;
            email.error = undefined;
        });
    }

    public clearFailedEmails() {
        const allEmails = this.queueManager.getAllQueuedEmails();
        allEmails
            .filter((email) => email.status === "failed")
            .forEach((email) => this.queueManager.clearQueue());
    }

    public async getEmailStatus(
        messageId: string
    ): Promise<EmailTrackingInfo | undefined> {
        return this.trackingMap.get(messageId);
    }

    public async getAllEmailStatuses(): Promise<EmailTrackingInfo[]> {
        return Array.from(this.trackingMap.values());
    }

    private async updateEmailStatus(
        messageId: string,
        status: Partial<EmailTrackingInfo>
    ): Promise<void> {
        const existing = this.trackingMap.get(messageId) || {
            messageId,
            status: "pending",
            attempts: 0,
        };

        this.trackingMap.set(messageId, {
            ...existing,
            ...status,
        });

        // Persist to runtime memory
        await this.runtime.messageManager.createMemory({
            id: messageId as UUID,
            userId: this.runtime.agentId,
            agentId: this.runtime.agentId,
            roomId: "email-tracking-room" as UUID,
            content: {
                type: "email-status-update",
                status: this.trackingMap.get(messageId),
                text: `Email status update: ${status.status}`,
            },
            createdAt: Date.now(),
        });
    }
}
