import { EmailClient } from "../index";
import { ContextGenerator } from "../contextGenerator";
import { TemplateValidator } from "../templateValidator";

describe("Email System Integration", () => {
    let emailClient: EmailClient;
    let contextGenerator: ContextGenerator;
    let templateValidator: TemplateValidator;

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
    };

    const mockRuntime = {
        messageManager: {
            createMemory: jest.fn(),
            getMemory: jest.fn(),
        },
        agentId: "test-agent",
    } as any; // Type assertion to avoid runtime type conflicts

    beforeEach(() => {
        emailClient = new EmailClient(mockConfig, mockRuntime);
        contextGenerator = new ContextGenerator();
        templateValidator = new TemplateValidator();
    });

    it("should process a complete accepted application flow", async () => {
        const application = {
            id: "123",
            name: "John Doe",
            email: "john@example.com",
            reviewScore: 85,
            strengths: ["Innovation"],
            reviewNotes: ["Strong technical background"],
        };

        const context = await contextGenerator.generateContext(application);
        const memory = await emailClient.sendEmail({
            template: "accepted",
            context,
            to: application.email,
            subject: "Your Application Status",
            text: "This is a fallback plain text",
        });

        const status = await emailClient.getEmailStatus(memory.id);
        expect(status.status).toBe("delivered");
    });

    it("should process a complete rejected application flow", async () => {
        const application = {
            id: "124",
            name: "Jane Smith",
            email: "jane@example.com",
            reviewScore: 45,
            reviewNotes: ["Insufficient market validation"],
        };

        const context = await contextGenerator.generateContext(application);
        const memory = await emailClient.sendEmail({
            template: "rejected",
            context,
            to: application.email,
            subject: "Application Status Update",
            text: "This is a fallback plain text",
        });

        const status = await emailClient.getEmailStatus(memory.id);
        expect(status.status).toBe("delivered");
    });
});
