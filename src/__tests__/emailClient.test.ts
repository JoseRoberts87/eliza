import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EmailClient } from "../emailClient";
import { EmailTemplates } from "email-templates";

describe("EmailClient", () => {
    describe("sendEmail", () => {
        it(
            "should send an email and create a memory",
            async () => {
                vi.useFakeTimers();
                const email = {
                    to: "test@example.com",
                    subject: "Test Email",
                    text: "Hello, World!",
                };

                const promise = emailClient.sendEmail(email);
                await vi.advanceTimersByTimeAsync(100);
                await promise;

                expect(transportMock.sendMail).toHaveBeenCalledWith(
                    expect.objectContaining(email)
                );
            },
            { timeout: 10000 }
        );

        it(
            "should handle template-based emails",
            async () => {
                vi.useFakeTimers();
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
                        html: expect.any(String),
                    })
                );
            },
            { timeout: 10000 }
        );

        it(
            "should handle errors gracefully",
            async () => {
                vi.useFakeTimers();
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
            },
            { timeout: 10000 }
        );
    });

    describe("handleMessage", () => {
        it(
            "should process valid email messages",
            async () => {
                vi.useFakeTimers();
                const message = {
                    to: "test@example.com",
                    subject: "Test Email",
                    text: "Hello, World!",
                };

                const promise = emailClient.handleMessage(message);
                await vi.advanceTimersByTimeAsync(100);
                await promise;

                expect(transportMock.sendMail).toHaveBeenCalledWith(
                    expect.objectContaining(message)
                );
            },
            { timeout: 10000 }
        );
    });
});
