import nodemailer from "nodemailer";
import EmailTemplates from "email-templates";
import path from "path";
import { IAgentRuntime, Memory, UUID } from "@elizaos/core";
import {
    EmailClientConfig,
    EmailContent,
    EmailStatus,
    ApplicationResult,
} from "./types";
import { QueueManager } from "./queueManager";
import { TemplateManager } from "./templateManager";
import { ContextGenerator } from "./contextGenerator";

export class EmailClient {
    private transporter: nodemailer.Transporter;
    private emailTemplates: EmailTemplates;
    private templateManager: TemplateManager;
    private contextGenerator: ContextGenerator;
    public queueManager: QueueManager;
    private config: EmailClientConfig;
    private runtime: IAgentRuntime;
    private statusMap: Map<string, EmailStatus> = new Map();

    constructor(config: EmailClientConfig, runtime: IAgentRuntime) {
        this.config = config;
        this.runtime = runtime;
        this.transporter = nodemailer.createTransport(config.smtp);
        this.templateManager = new TemplateManager(
            config.templatesDir || path.join(process.cwd(), "templates")
        );
        this.contextGenerator = new ContextGenerator();
        this.queueManager = new QueueManager(config.queue);

        this.emailTemplates = new EmailTemplates({
            views: {
                root:
                    config.templatesDir ||
                    path.join(process.cwd(), "templates"),
                options: { extension: "hbs" },
            },
        });

        this.setupQueueHandlers();
    }

    private setupQueueHandlers(): void {
        this.queueManager.on("process", async (email) => {
            try {
                const result = await this.transporter.sendMail(email.content);
                await this.updateEmailStatus(result.messageId, {
                    status: "delivered",
                    deliveredAt: new Date(),
                });
                return result;
            } catch (error) {
                console.error("Failed to send email:", error);
                await this.updateEmailStatus(email.id, {
                    status: "failed",
                    error:
                        error instanceof Error ? error.message : String(error),
                });
                throw error;
            }
        });

        this.queueManager.on("failed", async (email) => {
            await this.updateEmailStatus(email.id, {
                status: "failed",
                error: email.error,
            });
        });
    }

    public async generateResponseEmail(
        result: ApplicationResult
    ): Promise<EmailContent> {
        const context = await this.contextGenerator.generateContext(result);
        return {
            to: result.applicantEmail,
            subject: `Application Status: ${result.status.toUpperCase()}`,
            template: result.status === "accepted" ? "accepted" : "rejected",
            context,
            type: "application-response",
        };
    }

    public async sendEmail(content: EmailContent): Promise<Memory> {
        try {
            let html = "";
            if (content.template) {
                html = await this.emailTemplates.render(
                    content.template,
                    content.context || {}
                );
            }

            const mailOptions = {
                from: this.config.from,
                to: content.to,
                subject: content.subject,
                text: content.text || "",
                html: html || content.text || "",
            };

            const info = await this.transporter.sendMail(mailOptions);

            const memory: Memory = {
                id: info.messageId as UUID,
                userId: this.runtime.agentId,
                agentId: this.runtime.agentId,
                roomId: content.to as UUID,
                content: {
                    ...content,
                    type: content.type || "email",
                    text:
                        content.text ||
                        `Email sent: ${content.subject}\nTo: ${content.to}`,
                },
                createdAt: Date.now(),
            };

            await this.runtime.messageManager.createMemory(memory);
            await this.updateEmailStatus(info.messageId, {
                status: "delivered",
                deliveredAt: new Date(),
            });

            return memory;
        } catch (error) {
            console.error("Failed to send email:", error);
            // Create a temporary ID for failed emails
            const failedId = crypto.randomUUID();
            await this.updateEmailStatus(failedId, {
                status: "failed",
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }

    public async getEmailStatus(
        messageId: string
    ): Promise<EmailStatus | undefined> {
        return this.statusMap.get(messageId);
    }

    public async getAllEmailStatuses(): Promise<EmailStatus[]> {
        return Array.from(this.statusMap.values());
    }

    private async updateEmailStatus(
        messageId: string,
        status: Partial<EmailStatus>
    ): Promise<void> {
        const currentStatus = this.statusMap.get(messageId) || {
            messageId: messageId as UUID,
            status: "pending",
            attempts: 0,
        };

        this.statusMap.set(messageId, {
            ...currentStatus,
            ...status,
            attempts:
                status.status === "failed"
                    ? currentStatus.attempts + 1
                    : currentStatus.attempts,
        });
    }
}

export * from "./types";
