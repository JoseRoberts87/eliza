import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { QueueManager } from "../queueManager";
import { EmailContent } from "../index";

describe("QueueManager", () => {
    let queueManager: QueueManager;
    let processHandler: any;

    beforeEach(() => {
        vi.useFakeTimers();
        processHandler = vi.fn().mockResolvedValue(undefined);
        queueManager = new QueueManager({
            maxAttempts: 3,
            retryDelay: 10,
            maxConcurrent: 2,
            processInterval: 10,
        });

        // Register the process handler using the EventEmitter's on method
        queueManager.on("process", processHandler);
    });

    afterEach(() => {
        queueManager.stopProcessing();
        vi.clearAllTimers();
        vi.useRealTimers();
    });

    describe("Queue Management", () => {
        it("should add email to queue", async () => {
            const id = await queueManager.addToQueue({
                to: "test@example.com",
                subject: "Test Email",
                text: "Test content",
            });
            const queuedEmail = queueManager.getQueuedEmail(id);

            expect(queuedEmail).toBeDefined();
            expect(queuedEmail?.content).toEqual({
                to: "test@example.com",
                subject: "Test Email",
                text: "Test content",
            });
            expect(queuedEmail?.status).toBe("pending");
            expect(queuedEmail?.attempts).toBe(0);
        });

        it("should get all queued emails", async () => {
            await queueManager.addToQueue({
                to: "test@example.com",
                subject: "Test Email",
                text: "Test content",
            });
            await queueManager.addToQueue({
                to: "another@example.com",
                subject: "Test Email",
                text: "Test content",
            });

            const allEmails = queueManager.getAllQueuedEmails();
            expect(allEmails).toHaveLength(2);
        });

        it("should get pending emails", async () => {
            const id1 = await queueManager.addToQueue({
                to: "test@example.com",
                subject: "Test Email",
                text: "Test content",
            });
            const id2 = await queueManager.addToQueue({
                to: "another@example.com",
                subject: "Test Email",
                text: "Test content",
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
            await queueManager.addToQueue({
                to: "test@example.com",
                subject: "Test Email",
                text: "Test content",
            });
            await queueManager.addToQueue({
                to: "test@example.com",
                subject: "Test Email",
                text: "Test content",
            });

            queueManager.clearQueue();
            expect(queueManager.getAllQueuedEmails()).toHaveLength(0);
        });
    });

    describe("Queue Processing", () => {
        it("should process emails in queue", async () => {
            const email: EmailContent = {
                to: "test@example.com",
                subject: "Test Subject",
                text: "Test content",
            };
            const id = await queueManager.addToQueue(email);
            const queuedEmail = queueManager.getQueuedEmail(id);
            expect(queuedEmail?.status).toBe("pending");

            // Set up a promise to wait for the processing event
            const processingPromise = new Promise<void>((resolve) => {
                queueManager.once("processing", (processedEmail) => {
                    expect(processedEmail.status).toBe("processing");
                    expect(processedEmail.content).toEqual(email);
                    resolve();
                });
            });

            queueManager.startProcessing();
            await processingPromise;
            await vi.runAllTimersAsync();
        });

        it("should respect maxConcurrent limit", async () => {
            // Add 3 emails
            const emails = [
                {
                    to: "test1@example.com",
                    subject: "Test Subject 1",
                    text: "Test content 1",
                },
                {
                    to: "test2@example.com",
                    subject: "Test Subject 2",
                    text: "Test content 2",
                },
                {
                    to: "test3@example.com",
                    subject: "Test Subject 3",
                    text: "Test content 3",
                },
            ];

            const ids = await Promise.all(
                emails.map((email) => queueManager.addToQueue(email))
            );

            // Track processing events
            let processedCount = 0;
            const processingPromise = new Promise<void>((resolve) => {
                queueManager.on("processing", () => {
                    processedCount++;
                    if (processedCount === 2) {
                        resolve();
                    }
                });
            });

            // Start processing
            queueManager.startProcessing();

            // Wait for first two emails to be processed
            await processingPromise;
            await vi.advanceTimersByTimeAsync(0);

            // Should only process maxConcurrent (2) emails initially
            expect(processedCount).toBe(2);

            // Verify the third email is still pending
            const thirdEmail = queueManager.getQueuedEmail(ids[2]);
            expect(thirdEmail?.status).toBe("pending");

            // Clean up
            queueManager.stopProcessing();
        });

        it("should retry failed emails", async () => {
            processHandler.mockRejectedValueOnce(new Error("Test error"));

            const email: EmailContent = {
                to: "test@example.com",
                subject: "Test Subject",
                text: "Test content",
            };
            const id = await queueManager.addToQueue(email);

            // Set up a promise to wait for the retry event
            const retryPromise = new Promise<void>((resolve) => {
                queueManager.once("retry", (retryEmail) => {
                    expect(retryEmail.id).toBe(id);
                    expect(retryEmail.attempts).toBe(1);
                    expect(retryEmail.status).toBe("pending");
                    resolve();
                });
            });

            queueManager.startProcessing();
            await retryPromise;
            await vi.runAllTimersAsync();
        });

        it("should mark email as failed after max attempts", async () => {
            processHandler.mockRejectedValue(new Error("Test error"));

            const email: EmailContent = {
                to: "test@example.com",
                subject: "Test Subject",
                text: "Test content",
            };
            const id = await queueManager.addToQueue(email);

            // Track all events in order
            const events: Array<{ type: string; attempts: number }> = [];
            queueManager.on("processing", (email) =>
                events.push({ type: "processing", attempts: email.attempts })
            );
            queueManager.on("retry", (email) =>
                events.push({ type: "retry", attempts: email.attempts })
            );
            queueManager.on("failed", (email) =>
                events.push({ type: "failed", attempts: email.attempts })
            );

            // Start processing
            queueManager.startProcessing();

            // Wait for initial attempt
            await vi.advanceTimersByTimeAsync(0);
            // Wait for first retry
            await vi.advanceTimersByTimeAsync(1000);
            // Wait for second retry
            await vi.advanceTimersByTimeAsync(1000);
            // Wait for final attempt and failure
            await vi.advanceTimersByTimeAsync(1000);

            // Verify the sequence of events
            expect(events).toEqual([
                { type: "processing", attempts: 0 },
                { type: "retry", attempts: 1 },
                { type: "processing", attempts: 1 },
                { type: "retry", attempts: 2 },
                { type: "processing", attempts: 2 },
                { type: "failed", attempts: 3 },
            ]);

            // Verify final state
            const failedEmail = queueManager.getQueuedEmail(id);
            expect(failedEmail).toBeUndefined(); // Should be removed from queue
        }, 30000);
    });

    describe("Event Emission", () => {
        it("should emit events during email lifecycle", async () => {
            const events = {
                queued: vi.fn(),
                processing: vi.fn(),
                completed: vi.fn(),
                failed: vi.fn(),
                retry: vi.fn(),
            };

            Object.entries(events).forEach(([event, handler]) => {
                queueManager.on(event as any, handler);
            });

            const email: EmailContent = {
                to: "test@example.com",
                subject: "Test Subject",
                text: "Test content",
            };
            const id = await queueManager.addToQueue(email);

            expect(events.queued).toHaveBeenCalledWith(
                expect.objectContaining({
                    content: email,
                    status: "pending",
                })
            );

            // Set up a promise to wait for all events
            const processingPromise = new Promise<void>((resolve) => {
                queueManager.once("processing", (processedEmail) => {
                    expect(processedEmail.id).toBe(id);
                    expect(processedEmail.status).toBe("processing");
                    resolve();
                });
            });

            const completedPromise = new Promise<void>((resolve) => {
                queueManager.once("completed", (completedEmail) => {
                    expect(completedEmail.id).toBe(id);
                    expect(completedEmail.status).toBe("completed");
                    resolve();
                });
            });

            queueManager.startProcessing();
            await Promise.all([processingPromise, completedPromise]);
            await vi.runAllTimersAsync();
        });
    });
});
