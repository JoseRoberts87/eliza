import nodemailer from "nodemailer";
import EmailTemplates from "email-templates";
import path from "path";
import {
    Client,
    elizaLogger,
    IAgentRuntime,
    Memory,
    UUID,
} from "@elizaos/core";
import {
    EmailClientConfig,
    EmailContent,
    EmailStatus,
    ApplicationResult,
} from "./types";
import { QueueManager } from "./queueManager";
import { TemplateManager } from "./templateManager";
import { ContextGenerator } from "./contextGenerator";

class EmailClientManager {
    private transporter: nodemailer.Transporter;
    private emailTemplates: EmailTemplates;
    private templateManager: TemplateManager;
    private contextGenerator: ContextGenerator;
    public queueManager: QueueManager;
    private config: EmailClientConfig;
    private runtime: IAgentRuntime;
    private statusMap: Map<string, EmailStatus> = new Map();

    constructor(runtime: IAgentRuntime, config: EmailClientConfig) {
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

    public async sendEmail(content: EmailContent){
        elizaLogger.info("EmailContent:");
        try {
            let html = "";
            if (content.template) {
                html = await this.emailTemplates.render(
                    content.template,
                    content.context || {}
                );
            }
            elizaLogger.info("content.to:", content.to);

            const mailOptions = {
                from: this.config.from,
                to: content.to,
                subject: content.subject,
                text: content.text || "",
                html: html || content.text || "",
            };

            elizaLogger.info("Sending email to:", mailOptions.to);

            await this.transporter.sendMail(mailOptions);
            elizaLogger.info("Email sent to:", mailOptions.to);
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

export const EmailClientInterface: Client = {
    async start(runtime: IAgentRuntime) {
        elizaLogger.info("Starting email client");
        const config: EmailClientConfig = {
            smtp: {
                host: process.env.SMTP_HOST || "smtp.gmail.com",
                port: 465, // Gmail's SSL port
                secure: true, // Use SSL
                auth: {
                    user: process.env.SMTP_USER || "",
                    pass: process.env.SMTP_PASS || "",
                },
            },
            from: process.env.SMTP_FROM || "",
            templatesDir: path.join(
                process.cwd(),
                "packages",
                "client-email",
                "templates"
            ),
        };
        elizaLogger.info("Email client config", config);
        elizaLogger.info("runtime.agentId:!!!!", runtime.agentId);


        const manager = new EmailClientManager(runtime, config);
        return manager;
    },

    async stop(runtime: IAgentRuntime) {
        elizaLogger.warn("Email client does not support stopping yet");
    },
};

export default EmailClientInterface;

export * from "./types";
