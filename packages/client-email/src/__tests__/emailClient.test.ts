import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EmailClient } from "../index";
import { EmailTemplates } from "email-templates";

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
        it("should process valid email messages", async () => {
            const message = {
                id: "test-id",
                userId: "test-user",
                agentId: "test-agent",
                roomId: "test-room",
                content: {
                    to: "test@example.com",
                    subject: "Test Email",
                    text: "Hello, World!",
                },
                createdAt: Date.now(),
            };

            const promise = emailClient.handleMessage(message, {}, () => {});
            await vi.advanceTimersByTimeAsync(100);
            await promise;

            expect(transportMock.sendMail).toHaveBeenCalledWith(
                expect.objectContaining(message.content)
            );
        });

        it("should throw error for invalid email messages", async () => {
            const message = {
                id: "test-id",
                userId: "test-user",
                agentId: "test-agent",
                roomId: "test-room",
                content: {
                    text: "Hello, World!",
                },
                createdAt: Date.now(),
            };

            await expect(
                emailClient.handleMessage(message, {}, () => {})
            ).rejects.toThrow('Email requires "to" and "subject" fields');
        });
    });
});
