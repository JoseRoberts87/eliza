import { scoreGeneratorAction } from "../scoreGenerator";
import {
    IAgentRuntime,
    Memory,
    UUID,
    Content,
    HandlerCallback,
} from "@elizaos/core";

type MockFn = ReturnType<typeof jest.fn>;

describe("Score Generator Action", () => {
    const createMemoryMock = jest.fn().mockResolvedValue(undefined);

    const mockRuntime = {
        agentId: "test-agent-id" as UUID,
        documentsManager: {
            createMemory: createMemoryMock,
        },
    } as unknown as IAgentRuntime;

    const mockMessage: Memory = {
        id: "test-memory-id" as UUID,
        userId: "test-user-id" as UUID,
        roomId: "test-room-id" as UUID,
        agentId: "test-agent-id" as UUID,
        content: {
            text: "Generate score for application",
            uniquenessScore: 85,
            completionScore: 90,
            qualityScore: 88,
            innovationScore: 92,
        },
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should validate message with required scores", async () => {
        const isValid = await scoreGeneratorAction.validate(
            mockRuntime,
            mockMessage
        );
        expect(isValid).toBe(true);
    });

    it("should reject invalid message without required scores", async () => {
        const invalidMessage = {
            ...mockMessage,
            content: { text: "Invalid message" },
        };
        const isValid = await scoreGeneratorAction.validate(
            mockRuntime,
            invalidMessage
        );
        expect(isValid).toBe(false);
    });

    it("should generate correct weighted score", async () => {
        const mockCallback = jest
            .fn()
            .mockImplementation(async () => []) as unknown as HandlerCallback;
        await scoreGeneratorAction.handler(
            mockRuntime,
            mockMessage,
            undefined,
            undefined,
            mockCallback
        );

        // Verify callback was called with correct score
        expect(mockCallback).toHaveBeenCalledTimes(1);
        const [[callbackContent]] = (mockCallback as MockFn).mock.calls;
        expect((callbackContent as Content).type).toBe("application_score");
        expect((callbackContent as any).scores.totalScore).toBeGreaterThan(0);
        expect((callbackContent as any).scores.totalScore).toBeLessThanOrEqual(
            100
        );
    });

    it("should store score in memory", async () => {
        await scoreGeneratorAction.handler(mockRuntime, mockMessage);
        expect(createMemoryMock).toHaveBeenCalledTimes(1);

        const [[storedMemory]] = (createMemoryMock as MockFn).mock.calls;
        expect((storedMemory as Memory).content.type).toBe("application_score");
        expect((storedMemory as any).content.scores).toBeDefined();
        expect((storedMemory as any).content.weights).toBeDefined();

        // Verify the stored scores are correctly calculated
        const { scores } = (storedMemory as any).content;
        expect(scores.uniquenessScore).toBe(85);
        expect(scores.completionScore).toBe(90);
        expect(scores.qualityScore).toBe(88);
        expect(scores.innovationScore).toBe(92);
    });

    it("should handle custom weights", async () => {
        const customWeights = {
            uniqueness: 0.4,
            completion: 0.3,
            quality: 0.2,
            innovation: 0.1,
        };

        const messageWithWeights = {
            ...mockMessage,
            content: {
                ...mockMessage.content,
                weights: customWeights,
            },
        };

        const mockCallback = jest
            .fn()
            .mockImplementation(async () => []) as unknown as HandlerCallback;
        await scoreGeneratorAction.handler(
            mockRuntime,
            messageWithWeights,
            undefined,
            undefined,
            mockCallback
        );

        expect(mockCallback).toHaveBeenCalledTimes(1);
        const [[callbackContent]] = (mockCallback as MockFn).mock.calls;
        expect((callbackContent as any).weights).toEqual(customWeights);

        // Calculate expected total score with custom weights
        const expectedTotal =
            85 * customWeights.uniqueness +
            90 * customWeights.completion +
            88 * customWeights.quality +
            92 * customWeights.innovation;
        expect((callbackContent as any).scores.totalScore).toBe(expectedTotal);
    });

    it("should normalize scores to be between 0 and 100", async () => {
        const messageWithHighScores = {
            ...mockMessage,
            content: {
                ...mockMessage.content,
                uniquenessScore: 150,
                completionScore: -10,
            },
        };

        const mockCallback = jest
            .fn()
            .mockImplementation(async () => []) as unknown as HandlerCallback;
        await scoreGeneratorAction.handler(
            mockRuntime,
            messageWithHighScores,
            undefined,
            undefined,
            mockCallback
        );

        expect(mockCallback).toHaveBeenCalledTimes(1);
        const [[callbackContent]] = (mockCallback as MockFn).mock.calls;
        expect((callbackContent as any).scores.uniquenessScore).toBe(100);
        expect((callbackContent as any).scores.completionScore).toBe(0);
    });
});
