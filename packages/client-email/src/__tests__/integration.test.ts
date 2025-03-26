import { EmailClient } from "../index";
import { ContextGenerator } from "../contextGenerator";
import { TemplateManager } from "../templateManager";
import { describe, it, expect, vi, beforeEach } from "vitest";
import nodemailer from "nodemailer";

describe("Email System Integration", () => {
    let emailClient: EmailClient;
    let contextGenerator: ContextGenerator;
    let templateManager: TemplateManager;
    let transportMock: any;

    const mockConfig = {
        smtp: {
            host: "test.smtp.com",
            port: 587,
            secure: false,
            auth: {
                user: "test@example.com",
                pass: "test-password",
            },
        },
        from: "test@example.com",
        templatesDir: "./templates",
    };

    const mockRuntime = {
        messageManager: {
            createMemory: vi.fn(),
            getMemory: vi.fn(),
        },
        agentId: "test-agent",
    } as any;

    beforeEach(() => {
        // Mock nodemailer createTransport
        transportMock = {
            sendMail: vi
                .fn()
                .mockResolvedValue({ messageId: "test-message-id" }),
        };
        vi.spyOn(nodemailer, "createTransport").mockReturnValue(transportMock);

        emailClient = new EmailClient(mockConfig, mockRuntime);
        contextGenerator = new ContextGenerator();
        templateManager = new TemplateManager(mockConfig.templatesDir);
    });

    it("should process a complete accepted application flow", async () => {
        const application = {
            id: "123",
            status: "accepted",
            score: 85,
            reviewDate: new Date(),
            reviewerId: "AI-001",
            applicantEmail: "john@example.com",
            strengths: ["Innovation"],
            nextSteps: ["Schedule onboarding call", "Complete paperwork"],
        };

        const memory = await emailClient.sendEmail({
            template: "accepted",
            context: await contextGenerator.generateContext(application),
            to: application.applicantEmail,
            subject: "Your Application Status",
            text: "This is a fallback plain text",
        });

        expect(transportMock.sendMail).toHaveBeenCalledWith(
            expect.objectContaining({
                to: application.applicantEmail,
                subject: "Your Application Status",
            })
        );

        const status = await emailClient.getEmailStatus(memory.id);
        expect(status?.status).toBe("delivered");
    });

    it("should process a complete rejected application flow", async () => {
        const application = {
            id: "124",
            status: "rejected",
            score: 45,
            reviewDate: new Date(),
            reviewerId: "AI-001",
            applicantEmail: "jane@example.com",
            feedback: "Insufficient market validation",
        };

        const memory = await emailClient.sendEmail({
            template: "rejected",
            context: await contextGenerator.generateContext(application),
            to: application.applicantEmail,
            subject: "Application Status Update",
            text: "This is a fallback plain text",
        });

        expect(transportMock.sendMail).toHaveBeenCalledWith(
            expect.objectContaining({
                to: application.applicantEmail,
                subject: "Application Status Update",
            })
        );

        const status = await emailClient.getEmailStatus(memory.id);
        expect(status?.status).toBe("delivered");
    });
});
