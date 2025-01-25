import { questionsAnalyzerAction } from "../questionsAnalyzer";
import { IAgentRuntime, Memory, State, UUID } from "@elizaos/core";

// Mock the core functions
jest.mock("@elizaos/core", () => ({
    ...jest.requireActual("@elizaos/core"),
    composeContext: jest.fn().mockReturnValue("mocked context"),
    generateObject: jest.fn().mockResolvedValue({
        object: {
            quality: 85,
            relevance: 90,
            feedback: "Good response but needs more detail",
        },
    }),
}));

describe("questionsAnalyzerAction", () => {
    let mockRuntime: jest.Mocked<IAgentRuntime>;
    let mockMessage: Memory;
    let mockState: State;
    let mockCallback: jest.Mock;

    beforeEach(() => {
        mockRuntime = {
            agentId: "test-agent-id" as UUID,
            messageManager: {
                createMemory: jest.fn().mockResolvedValue(undefined),
            },
        } as unknown as jest.Mocked<IAgentRuntime>;

        mockMessage = {
            userId: "test-user" as UUID,
            roomId: "test-room" as UUID,
            agentId: "test-agent-id" as UUID,
            content: {
                text: "Please analyze this response",
                question: "What is your go-to-market strategy?",
                answer: "We plan to target small businesses through direct sales.",
            },
        };

        mockState = {
            userId: "test-user" as UUID,
            roomId: "test-room" as UUID,
            recentMessages: "",
            recentMessagesData: [],
            bio: "",
            lore: "",
            messageDirections: "",
            postDirections: "",
            actors: "",
        };

        mockCallback = jest.fn();
    });

    describe("validate", () => {
        it("should return true when message contains question and answer", async () => {
            const result = await questionsAnalyzerAction.validate(
                mockRuntime,
                mockMessage
            );
            expect(result).toBe(true);
        });

        it("should return false when message is missing question or answer", async () => {
            const invalidMessage = {
                ...mockMessage,
                content: { text: "Invalid message" },
            };
            const result = await questionsAnalyzerAction.validate(
                mockRuntime,
                invalidMessage
            );
            expect(result).toBe(false);
        });
    });

    describe("handler", () => {
        it("should analyze question response and store results", async () => {
            await questionsAnalyzerAction.handler(
                mockRuntime,
                mockMessage,
                mockState,
                {},
                mockCallback
            );

            // Verify memory was created
            expect(
                mockRuntime.messageManager.createMemory
            ).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: mockMessage.userId,
                    roomId: mockMessage.roomId,
                    agentId: mockRuntime.agentId,
                    content: expect.objectContaining({
                        text: "Question Analysis",
                        analysis: {
                            quality: 85,
                            relevance: 90,
                            feedback: "Good response but needs more detail",
                        },
                    }),
                })
            );

            // Verify callback was called with correct analysis
            expect(mockCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    text: expect.stringContaining("Quality Score: 85/100"),
                    action: "ANALYZE_ADDITIONAL_QUESTIONS",
                    analysis: {
                        quality: 85,
                        relevance: 90,
                        feedback: "Good response but needs more detail",
                    },
                }),
                []
            );
        });

        it("should handle errors gracefully", async () => {
            // Mock generateObject to throw error
            const { generateObject } = require("@elizaos/core");
            generateObject.mockRejectedValueOnce(new Error("Analysis failed"));

            await questionsAnalyzerAction.handler(
                mockRuntime,
                mockMessage,
                mockState,
                {},
                mockCallback
            );

            // Verify error callback
            expect(mockCallback).toHaveBeenCalledWith(
                {
                    text: "Failed to analyze the question response. Please try again.",
                    error: "Analysis failed",
                },
                []
            );
        });
    });
});
