import { scoreGeneratorAction } from "../scoreGenerator";
import {
    IAgentRuntime,
    Memory,
    UUID,
    Content,
    HandlerCallback,
} from "@elizaos/core";

interface ScoreContent extends Content {
    uniquenessScore: number;
    completionScore: number;
    qualityScore: number;
    innovationScore: number;
    weights?: {
        uniqueness: number;
        completion: number;
        quality: number;
        innovation: number;
    };
}

interface ScoreResponse extends Content {
    scores: {
        uniquenessScore: number;
        completionScore: number;
        qualityScore: number;
        innovationScore: number;
        totalScore: number;
    };
    weights: {
        uniqueness: number;
        completion: number;
        quality: number;
        innovation: number;
    };
    type: "application_score";
}

type MockHandlerCallback = jest.Mock<ReturnType<HandlerCallback>> &
    HandlerCallback;

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
        } as ScoreContent,
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
            content: { text: "Invalid message" } as Content,
        };
        const isValid = await scoreGeneratorAction.validate(
            mockRuntime,
            invalidMessage
        );
        expect(isValid).toBe(false);
    });

    it("should generate correct weighted score", async () => {
        const mockCallback = jest.fn() as MockHandlerCallback;
        await scoreGeneratorAction.handler(
            mockRuntime,
            mockMessage,
            undefined,
            undefined,
            mockCallback
        );

        // Verify callback was called with correct score
        expect(mockCallback).toHaveBeenCalledTimes(1);
        const [[callbackContent]] = mockCallback.mock.calls;
        const response = callbackContent as ScoreResponse;

        expect(response.type).toBe("application_score");
        expect(response.scores.totalScore).toBeGreaterThan(0);
        expect(response.scores.totalScore).toBeLessThanOrEqual(100);

        // Verify default weights were used
        expect(response.weights).toEqual({
            uniqueness: 0.3,
            completion: 0.25,
            quality: 0.25,
            innovation: 0.2,
        });
    });

    it("should store score in memory", async () => {
        await scoreGeneratorAction.handler(mockRuntime, mockMessage);
        expect(createMemoryMock).toHaveBeenCalledTimes(1);

        const [[storedMemory]] = createMemoryMock.mock.calls;
        const content = (storedMemory as Memory).content as ScoreResponse;

        expect(content.type).toBe("application_score");
        expect(content.scores).toBeDefined();
        expect(content.weights).toBeDefined();

        // Verify the stored scores match input
        expect(content.scores.uniquenessScore).toBe(85);
        expect(content.scores.completionScore).toBe(90);
        expect(content.scores.qualityScore).toBe(88);
        expect(content.scores.innovationScore).toBe(92);
    });

    it("should handle custom weights", async () => {
        const customWeights = {
            uniqueness: 0.4,
            completion: 0.3,
            quality: 0.2,
            innovation: 0.1,
        };

        const messageWithWeights: Memory = {
            ...mockMessage,
            content: {
                ...mockMessage.content,
                weights: customWeights,
            } as ScoreContent,
        };

        const mockCallback = jest.fn() as MockHandlerCallback;
        await scoreGeneratorAction.handler(
            mockRuntime,
            messageWithWeights,
            undefined,
            undefined,
            mockCallback
        );

        expect(mockCallback).toHaveBeenCalledTimes(1);
        const [[callbackContent]] = mockCallback.mock.calls;
        const response = callbackContent as ScoreResponse;

        expect(response.weights).toEqual(customWeights);

        // Calculate expected total score with custom weights
        const expectedTotal =
            85 * customWeights.uniqueness +
            90 * customWeights.completion +
            88 * customWeights.quality +
            92 * customWeights.innovation;
        expect(response.scores.totalScore).toBe(expectedTotal);
    });

    it("should normalize scores to be between 0 and 100", async () => {
        const messageWithHighScores: Memory = {
            ...mockMessage,
            content: {
                ...mockMessage.content,
                uniquenessScore: 150,
                completionScore: -10,
            } as ScoreContent,
        };

        const mockCallback = jest.fn() as MockHandlerCallback;
        await scoreGeneratorAction.handler(
            mockRuntime,
            messageWithHighScores,
            undefined,
            undefined,
            mockCallback
        );

        expect(mockCallback).toHaveBeenCalledTimes(1);
        const [[callbackContent]] = mockCallback.mock.calls;
        const response = callbackContent as ScoreResponse;

        expect(response.scores.uniquenessScore).toBe(100);
        expect(response.scores.completionScore).toBe(0);
    });
});
