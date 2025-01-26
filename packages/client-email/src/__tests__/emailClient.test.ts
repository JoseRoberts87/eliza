import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EmailClient } from "../index";
import EmailTemplates from "email-templates";
import { UUID, Memory, State, HandlerCallback } from "@elizaos/core";

vi.mock("email-templates", () => {
    return {
        default: vi.fn().mockImplementation(() => ({
            render: vi.fn().mockResolvedValue("<h1>Test</h1>"),
        })),
    };
});

describe("EmailClient", () => {
    let emailClient: EmailClient;
    let transportMock: any;
    let runtimeMock: any;

    beforeEach(() => {
        vi.useFakeTimers();
        transportMock = {
            sendMail: vi.fn().mockResolvedValue({ messageId: "test-id" }),
        };
        runtimeMock = {
            agentId: "test-agent",
            messageManager: {
                createMemory: vi.fn().mockResolvedValue(undefined),
            },
        };

        emailClient = new EmailClient(
            {
                smtp: {
                    host: "test.smtp.com",
                    port: 587,
                    secure: false,
                    auth: {
                        user: "test",
                        pass: "test",
                    },
                },
                from: "test@example.com",
                queue: {
                    maxAttempts: 3,
                    retryDelay: 100,
                    maxConcurrent: 2,
                    processInterval: 100,
                },
            },
            runtimeMock
        );
    });

    afterEach(() => {
        vi.clearAllTimers();
        vi.useRealTimers();
    });

    describe("sendEmail", () => {
        it("should send an email and create a memory", async () => {
            const email = {
                to: "test@example.com",
                subject: "Test Email",
                text: "Hello, World!",
            };

            const promise = emailClient.sendEmail(email);
            await vi.advanceTimersByTimeAsync(100);
            const memory = await promise;

            expect(transportMock.sendMail).toHaveBeenCalledWith(
                expect.objectContaining(email)
            );
            expect(memory).toEqual(
                expect.objectContaining({
                    userId: runtimeMock.agentId,
                    agentId: runtimeMock.agentId,
                    roomId: email.to,
                    content: expect.objectContaining(email),
                })
            );
        });

        it("should handle template-based emails", async () => {
            const email = {
                to: "test@example.com",
                template: "welcome",
                context: { name: "John" },
                subject: "Welcome Email",
                text: "Welcome to our platform",
            };

            const promise = emailClient.sendEmail(email);
            await vi.advanceTimersByTimeAsync(100);
            await promise;

            expect(transportMock.sendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: email.to,
                    html: "<h1>Test</h1>",
                })
            );
        });

        it("should handle errors gracefully", async () => {
            transportMock.sendMail.mockRejectedValueOnce(
                new Error("SMTP error")
            );
            const email = {
                to: "test@example.com",
                subject: "Test Email",
                text: "Hello, World!",
            };

            const promise = emailClient.sendEmail(email);
            await vi.advanceTimersByTimeAsync(100);
            await expect(promise).rejects.toThrow("SMTP error");
        });
    });

    describe("handleMessage", () => {
        const mockState: State = {
            bio: "",
            lore: "",
            messageDirections: "",
            postDirections: "",
            memories: [],
            posts: [],
            rooms: [],
            users: [],
            roomId: "12345678-1234-1234-1234-123456789015" as UUID,
            actors: "",
            recentMessages: "",
            recentMessagesData: [],
        };

        const mockCallback: HandlerCallback = async () => {
            return Promise.resolve([]);
        };

        it("should process valid email messages", async () => {
            const message: Memory = {
                id: "12345678-1234-1234-1234-123456789012" as UUID,
                userId: "12345678-1234-1234-1234-123456789013" as UUID,
                agentId: "12345678-1234-1234-1234-123456789014" as UUID,
                roomId: "12345678-1234-1234-1234-123456789015" as UUID,
                content: {
                    to: "test@example.com",
                    subject: "Test Email",
                    text: "Hello, World!",
                },
                createdAt: Date.now(),
            };

            const promise = emailClient.handleMessage(
                message,
                mockState,
                mockCallback
            );
            await vi.advanceTimersByTimeAsync(100);
            await promise;

            expect(transportMock.sendMail).toHaveBeenCalledWith(
                expect.objectContaining(message.content)
            );
        });

        it("should throw error for invalid email messages", async () => {
            const message: Memory = {
                id: "12345678-1234-1234-1234-123456789012" as UUID,
                userId: "12345678-1234-1234-1234-123456789013" as UUID,
                agentId: "12345678-1234-1234-1234-123456789014" as UUID,
                roomId: "12345678-1234-1234-1234-123456789015" as UUID,
                content: {
                    text: "Hello, World!",
                },
                createdAt: Date.now(),
            };

            await expect(
                emailClient.handleMessage(message, mockState, mockCallback)
            ).rejects.toThrow('Email requires "to" and "subject" fields');
        });
    });

    describe("Email Tracking", () => {
        it("should track email delivery status", async () => {
            const email = {
                to: "test@example.com",
                subject: "Test Email",
                text: "Hello, World!",
            };

            const memory = await emailClient.sendEmail(email);
            const status = await emailClient.getEmailStatus(memory.id);

            expect(status).toBeDefined();
            expect(status?.status).toBe("delivered");
            expect(status?.sentAt).toBeDefined();
            expect(status?.deliveredAt).toBeDefined();
        });

        it("should track failed email attempts", async () => {
            transportMock.sendMail.mockRejectedValueOnce(
                new Error("SMTP error")
            );

            const email = {
                to: "test@example.com",
                subject: "Test Email",
                text: "Hello, World!",
            };

            try {
                await emailClient.sendEmail(email);
            } catch (error) {
                const statuses = await emailClient.getAllEmailStatuses();
                const failedEmail = statuses.find((s) => s.status === "failed");

                expect(failedEmail).toBeDefined();
                expect(failedEmail?.error).toBe("SMTP error");
            }
        });
    });

    describe("Application Response System", () => {
        it("should handle template-based acceptance email", async () => {
            const email = {
                to: "applicant@example.com",
                subject: "Application Accepted",
                template: "acceptance",
                text: "Base text content",
                context: {
                    applicantName: "John Doe",
                    programName: "Startup Accelerator",
                    nextSteps: ["Complete onboarding", "Schedule orientation"],
                },
            };

            const promise = emailClient.sendEmail(email);
            await vi.advanceTimersByTimeAsync(100);
            const memory = await promise;

            expect(transportMock.sendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: email.to,
                    subject: email.subject,
                    html: "<h1>Test</h1>", // This comes from the mocked EmailTemplates
                })
            );
            expect(memory).toEqual(
                expect.objectContaining({
                    userId: runtimeMock.agentId,
                    agentId: runtimeMock.agentId,
                    roomId: email.to,
                    content: expect.objectContaining(email),
                })
            );
        });

        it("should handle template-based rejection email", async () => {
            const email = {
                to: "applicant@example.com",
                subject: "Application Status Update",
                template: "rejection",
                text: "Base text content",
                context: {
                    applicantName: "Jane Smith",
                    feedback:
                        "Strong application but not aligned with current focus",
                },
            };

            const promise = emailClient.sendEmail(email);
            await vi.advanceTimersByTimeAsync(100);
            const memory = await promise;

            expect(transportMock.sendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: email.to,
                    subject: email.subject,
                    html: "<h1>Test</h1>", // This comes from the mocked EmailTemplates
                })
            );
        });

        it("should track application email delivery status", async () => {
            const email = {
                to: "applicant@example.com",
                subject: "Application Status",
                template: "status-update",
                text: "Your application status has been updated",
                context: {
                    status: "under_review",
                },
            };

            const promise = emailClient.sendEmail(email);
            await vi.advanceTimersByTimeAsync(100);
            const memory = await promise;

            const status = await emailClient.getEmailStatus(memory.id);
            expect(status).toBeDefined();
            expect(status?.status).toBe("delivered");
            expect(status?.sentAt).toBeDefined();
            expect(status?.deliveredAt).toBeDefined();
        });

        it("should retry failed application emails", async () => {
            transportMock.sendMail.mockRejectedValueOnce(
                new Error("SMTP error")
            );

            const email = {
                to: "applicant@example.com",
                subject: "Important Application Update",
                text: "Critical update about your application",
            };

            const promise = emailClient.sendEmail(email);
            await vi.advanceTimersByTimeAsync(100);
            await expect(promise).rejects.toThrow("SMTP error");

            const status = await emailClient.getQueueStatus();
            expect(status.failed).toBeGreaterThan(0);

            emailClient.retryFailedEmails();
            expect(emailClient.getQueueStatus().failed).toBe(0);
            expect(emailClient.getQueueStatus().pending).toBeGreaterThan(0);
        });
    });
});
