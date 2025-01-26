import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { QueueManager, QueuedEmail } from "../queueManager";
import { EmailContent } from "../index";

describe("QueueManager", () => {
    let queueManager: QueueManager;
    let testEmail: EmailContent;
    const config = {
        maxAttempts: 3,
        retryDelay: 100,
        maxConcurrent: 2,
        processInterval: 100,
    };

    beforeEach(() => {
        vi.useFakeTimers();
        queueManager = new QueueManager(config);

        testEmail = {
            to: "test@example.com",
            subject: "Test Email",
            text: "Test content",
        };
    });

    afterEach(() => {
        vi.clearAllTimers();
        vi.useRealTimers();
    });

    describe("Queue Management", () => {
        it("should add email to queue", async () => {
            const id = await queueManager.addToQueue(testEmail);
            const queuedEmail = queueManager.getQueuedEmail(id);

            expect(queuedEmail).toBeDefined();
            expect(queuedEmail?.content).toEqual(testEmail);
            expect(queuedEmail?.status).toBe("pending");
            expect(queuedEmail?.attempts).toBe(0);
        });

        it("should get all queued emails", async () => {
            await queueManager.addToQueue(testEmail);
            await queueManager.addToQueue({
                ...testEmail,
                to: "another@example.com",
            });

            const allEmails = queueManager.getAllQueuedEmails();
            expect(allEmails).toHaveLength(2);
        });

        it("should get pending emails", async () => {
            const id1 = await queueManager.addToQueue(testEmail);
            const id2 = await queueManager.addToQueue({
                ...testEmail,
                to: "another@example.com",
            });

            const email = queueManager.getQueuedEmail(id1);
            if (email) {
                email.status = "failed";
            }

            const pendingEmails = queueManager.getPendingEmails();
            expect(pendingEmails).toHaveLength(1);
            expect(pendingEmails[0].id).toBe(id2);
        });

        it("should clear the queue", async () => {
            await queueManager.addToQueue(testEmail);
            await queueManager.addToQueue(testEmail);

            queueManager.clearQueue();
            expect(queueManager.getAllQueuedEmails()).toHaveLength(0);
        });
    });

    describe("Queue Processing", () => {
        it("should process emails in queue", async () => {
            const processHandler = vi.fn();
            queueManager.on("process", processHandler);

            await queueManager.addToQueue(testEmail);

            // Fast-forward time to trigger queue processing
            vi.advanceTimersByTime(100);

            expect(processHandler).toHaveBeenCalled();
        });

        it("should respect maxConcurrent limit", async () => {
            const processHandler = vi
                .fn()
                .mockImplementation(
                    () => new Promise((resolve) => setTimeout(resolve, 1000))
                );
            queueManager.on("process", processHandler);

            // Add 3 emails to queue
            queueManager.addToQueue({ to: "test1@example.com" });
            queueManager.addToQueue({ to: "test2@example.com" });
            queueManager.addToQueue({ to: "test3@example.com" });

            // Start processing
            queueManager.startProcessing();
            await vi.advanceTimersByTimeAsync(100);

            // Should only process 2 emails concurrently (maxConcurrent)
            expect(processHandler).toHaveBeenCalledTimes(2);

            // Complete one email
            await vi.advanceTimersByTimeAsync(1000);

            // Should now process the third email
            await vi.advanceTimersByTimeAsync(100);
            expect(processHandler).toHaveBeenCalledTimes(3);
        });

        it("should retry failed emails", async () => {
            const processHandler = vi
                .fn()
                .mockRejectedValue(new Error("Test error"));
            queueManager.on("process", processHandler);

            const id = queueManager.addToQueue({ to: "test@example.com" });
            queueManager.startProcessing();

            // First attempt
            await vi.advanceTimersByTimeAsync(100);
            let email = queueManager.getQueuedEmail(id);
            expect(email?.attempts).toBe(1);
            expect(email?.status).toBe("pending");

            // Second attempt
            await vi.advanceTimersByTimeAsync(config.retryDelay);
            await vi.advanceTimersByTimeAsync(100);
            email = queueManager.getQueuedEmail(id);
            expect(email?.attempts).toBe(2);
            expect(email?.status).toBe("pending");
        });

        it("should mark email as failed after max attempts", async () => {
            const processHandler = vi
                .fn()
                .mockRejectedValue(new Error("Test error"));
            queueManager.on("process", processHandler);

            const id = queueManager.addToQueue({ to: "test@example.com" });
            queueManager.startProcessing();

            // Process all attempts
            for (let i = 0; i < config.maxAttempts; i++) {
                await vi.advanceTimersByTimeAsync(100);
                await vi.advanceTimersByTimeAsync(config.retryDelay);
            }

            const failedEmail = queueManager.getQueuedEmail(id);
            expect(failedEmail?.status).toBe("failed");
            expect(failedEmail?.attempts).toBe(config.maxAttempts);
            expect(processHandler).toHaveBeenCalledTimes(config.maxAttempts);
        });
    });

    describe("Event Emission", () => {
        it("should emit events during email lifecycle", async () => {
            const events = {
                queued: vi.fn(),
                processing: vi.fn(),
                retry: vi.fn(),
                completed: vi.fn(),
                failed: vi.fn(),
            };

            Object.entries(events).forEach(([event, handler]) => {
                queueManager.on(event as any, handler);
            });

            // First attempt (fails)
            const processHandler = vi
                .fn()
                .mockRejectedValueOnce(new Error("Test error"))
                .mockResolvedValueOnce(undefined);
            queueManager.on("process", processHandler);

            const id = queueManager.addToQueue({ to: "test@example.com" });
            const queuedEmail = queueManager.getQueuedEmail(id);
            expect(events.queued).toHaveBeenCalledWith(queuedEmail);

            queueManager.startProcessing();
            await vi.advanceTimersByTimeAsync(100);

            expect(events.processing).toHaveBeenCalledWith(
                expect.objectContaining({ id })
            );
            expect(events.retry).toHaveBeenCalledWith(
                expect.objectContaining({ id })
            );

            // Second attempt (succeeds)
            await vi.advanceTimersByTimeAsync(config.retryDelay);
            await vi.advanceTimersByTimeAsync(100);
            expect(events.processing).toHaveBeenCalledTimes(2);
            expect(events.completed).toHaveBeenCalledWith(
                expect.objectContaining({ id })
            );
        });
    });
});
