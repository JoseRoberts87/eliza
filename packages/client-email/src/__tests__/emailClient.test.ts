import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EmailClient } from "../index";
import { EmailContent, ApplicationResult } from "../types";

describe("Application Response System", () => {
    let emailClient: EmailClient;
    let transportMock: any;
    let runtimeMock: any;

    beforeEach(() => {
        // Simple mocks that just work
        transportMock = {
            sendMail: vi.fn().mockResolvedValue({ messageId: "test-id" }),
        };

        runtimeMock = {
            agentId: "test-agent",
            messageManager: {
                createMemory: vi.fn().mockResolvedValue(undefined),
            },
        };

        // Mock templates globally
        vi.mock("email-templates", () => ({
            default: vi.fn().mockImplementation(() => ({
                render: vi.fn().mockResolvedValue("<h1>Test Email</h1>"),
            })),
        }));

        emailClient = new EmailClient(
            {
                smtp: {
                    host: "test.smtp.com",
                    port: 587,
                    secure: false,
                    auth: { user: "test", pass: "test" },
                },
                from: "test@example.com",
            },
            runtimeMock
        );

        emailClient["transporter"] = transportMock;
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it("should handle the complete application response flow", async () => {
        // 1. Generate email from application result
        const result: ApplicationResult = {
            status: "accepted",
            score: 85,
            reviewDate: new Date(),
            reviewerId: "AI-001",
            applicantEmail: "applicant@example.com",
        };

        const email = await emailClient.generateResponseEmail(result);
        expect(email.to).toBe(result.applicantEmail);
        expect(email.template).toBe("accepted");

        // 2. Send the email
        const memory = await emailClient.sendEmail(email);
        expect(transportMock.sendMail).toHaveBeenCalled();
        expect(memory.content).toMatchObject(email);

        // 3. Check email status
        const status = await emailClient.getEmailStatus(memory.id);
        expect(status?.status).toBe("delivered");
    });

    it("should handle failed email delivery", async () => {
        const error = new Error("SMTP error");
        transportMock.sendMail.mockRejectedValueOnce(error);

        const email: EmailContent = {
            to: "test@example.com",
            subject: "Test Subject",
            text: "Test content",
        };

        let failedId: string;
        try {
            await emailClient.sendEmail(email);
        } catch (e) {
            // Expected error
            const statuses = await emailClient.getAllEmailStatuses();
            const failedStatus = statuses.find((s) => s.status === "failed");
            failedId = failedStatus?.messageId!;
        }

        // Get the email status using the failed ID
        const status = await emailClient.getEmailStatus(failedId!);
        expect(status?.status).toBe("failed");
        expect(status?.error).toBe("SMTP error");
    });
});
