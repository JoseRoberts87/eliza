import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { QueueManager } from "../queueManager";

describe("QueueManager", () => {
    let queueManager: QueueManager;
    const config = {
        maxAttempts: 3,
        retryDelay: 100,
        maxConcurrent: 2,
        processInterval: 100,
    };

    beforeEach(() => {
        vi.useFakeTimers();
        queueManager = new QueueManager(config);
    });

    afterEach(() => {
        vi.clearAllTimers();
        vi.useRealTimers();
    });

    describe("Queue Processing", () => {
        it("should respect maxConcurrent limit", async () => {
            const processHandler = vi.fn();
            queueManager.on("processing", processHandler);

            // Add 3 emails to queue
            const id1 = queueManager.addToQueue({ to: "test1@example.com" });
            const id2 = queueManager.addToQueue({ to: "test2@example.com" });
            const id3 = queueManager.addToQueue({ to: "test3@example.com" });

            // Start processing
            queueManager.startProcessing();
            await vi.advanceTimersByTimeAsync(100);

            // Should only process 2 emails concurrently (maxConcurrent)
            expect(processHandler).toHaveBeenCalledTimes(2);

            // Complete one email
            queueManager.emit("completed", id1);
            await vi.advanceTimersByTimeAsync(100);

            // Should now process the third email
            expect(processHandler).toHaveBeenCalledTimes(3);
        });

        it("should retry failed emails", async () => {
            const id = queueManager.addToQueue({ to: "test@example.com" });
            const processHandler = vi
                .fn()
                .mockRejectedValue(new Error("Test error"));
            queueManager.on("processing", processHandler);

            // Start processing and fail first attempt
            queueManager.startProcessing();
            await vi.advanceTimersByTimeAsync(100);

            const emailAfterFirstAttempt = queueManager.getQueuedEmail(id);
            expect(emailAfterFirstAttempt?.attempts).toBe(1);
            expect(emailAfterFirstAttempt?.status).toBe("pending");

            // Wait for retry delay and check second attempt
            await vi.advanceTimersByTimeAsync(config.retryDelay);
            const emailAfterSecondAttempt = queueManager.getQueuedEmail(id);
            expect(emailAfterSecondAttempt?.attempts).toBe(2);
        });

        it("should mark email as failed after max attempts", async () => {
            const id = queueManager.addToQueue({ to: "test@example.com" });
            const processHandler = vi
                .fn()
                .mockRejectedValue(new Error("Test error"));
            queueManager.on("processing", processHandler);

            // Start processing
            queueManager.startProcessing();

            // Advance through all retry attempts
            for (let i = 0; i < config.maxAttempts; i++) {
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

            const id = queueManager.addToQueue({ to: "test@example.com" });
            expect(events.queued).toHaveBeenCalledWith(id);

            // First attempt (fails)
            const processHandler = vi
                .fn()
                .mockRejectedValueOnce(new Error("Test error"))
                .mockResolvedValueOnce(undefined);
            queueManager.on("processing", processHandler);

            queueManager.startProcessing();
            await vi.advanceTimersByTimeAsync(100);
            expect(events.processing).toHaveBeenCalledTimes(1);
            expect(events.retry).toHaveBeenCalledTimes(1);

            // Second attempt (succeeds)
            await vi.advanceTimersByTimeAsync(config.retryDelay);
            expect(events.processing).toHaveBeenCalledTimes(2);
            expect(events.completed).toHaveBeenCalledTimes(1);
        });
    });
});
