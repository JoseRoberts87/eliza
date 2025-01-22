import { uniquenessAssessorAction } from "../uniquenessAssessor";
import { IAgentRuntime, Memory, UUID, HandlerCallback } from "@elizaos/core";

jest.mock("@elizaos/core", () => ({
    ...jest.requireActual("@elizaos/core"),
    composeContext: jest.fn().mockReturnValue("mocked context"),
    generateObject: jest.fn(),
}));

describe("uniquenessAssessorAction", () => {
    let mockRuntime: IAgentRuntime;
    let mockMessage: Memory;
    let mockState: any;
    let mockCallback: HandlerCallback;
    let mockMemoryManager: any;

    beforeEach(() => {
        mockMemoryManager = {
            createMemory: jest.fn(),
        };

        mockRuntime = {
            agentId: "test-agent-id" as UUID,
            getMemoryManager: jest.fn().mockReturnValue(mockMemoryManager),
        } as unknown as IAgentRuntime;

        mockMessage = {
            id: "test-message-id" as UUID,
            userId: "test-user-id" as UUID,
            roomId: "test-room-id" as UUID,
            agentId: "test-agent-id" as UUID,
            content: {
                text: "Test application content",
            },
        };

        mockState = {
            applicationId: "test-app-id",
            companyName: "Test Company",
            description: "Test Description",
            additionalInfo: "Test Additional Info",
        };

        mockCallback = jest.fn().mockResolvedValue([]);
    });

    describe("validate", () => {
        it("should return true when memory manager is available", async () => {
            const result = await uniquenessAssessorAction.validate(
                mockRuntime,
                mockMessage
            );
            expect(result).toBe(true);
            expect(mockRuntime.getMemoryManager).toHaveBeenCalledWith(
                "uniqueness_assessments"
            );
        });

        it("should return false when memory manager is not available", async () => {
            mockRuntime.getMemoryManager = jest.fn().mockReturnValue(null);
            const result = await uniquenessAssessorAction.validate(
                mockRuntime,
                mockMessage
            );
            expect(result).toBe(false);
        });
    });

    describe("handler", () => {
        const mockAssessment = {
            object: {
                innovationScore: 85,
                uniquenessScore: 90,
                similarApplications: [
                    {
                        id: "similar-app-1",
                        similarity: 75,
                        matchingAspects: ["tech stack", "market focus"],
                    },
                ],
                innovativeAspects: ["Novel approach", "Unique technology"],
                marketDifferentiators: ["Better performance", "Lower cost"],
                recommendations: ["Focus on scalability", "Enhance security"],
            },
        };

        beforeEach(() => {
            const { generateObject } = require("@elizaos/core");
            (generateObject as jest.Mock).mockResolvedValue(mockAssessment);
        });

        it("should return early if state or callback is missing", async () => {
            await uniquenessAssessorAction.handler(mockRuntime, mockMessage);
            expect(mockCallback).not.toHaveBeenCalled();
        });

        it("should store assessment in memory and return formatted response", async () => {
            await uniquenessAssessorAction.handler(
                mockRuntime,
                mockMessage,
                mockState,
                {},
                mockCallback
            );

            // Verify memory storage
            expect(mockMemoryManager.createMemory).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: mockMessage.id,
                    userId: mockMessage.userId,
                    agentId: mockRuntime.agentId,
                    roomId: mockMessage.roomId,
                    content: expect.objectContaining({
                        type: "uniqueness_assessment",
                        applicationId: mockState.applicationId,
                    }),
                })
            );

            // Verify callback response
            expect(mockCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    text: expect.stringContaining("Innovation Score: 85/100"),
                }),
                []
            );
        });

        it("should handle error when memory manager is not available", async () => {
            mockRuntime.getMemoryManager = jest.fn().mockReturnValue(null);

            await uniquenessAssessorAction.handler(
                mockRuntime,
                mockMessage,
                mockState,
                {},
                mockCallback
            );

            expect(mockCallback).toHaveBeenCalledWith(
                { text: "Memory manager is not available." },
                []
            );
        });

        it("should handle invalid assessment object", async () => {
            const { generateObject } = require("@elizaos/core");
            (generateObject as jest.Mock).mockResolvedValue({
                object: { invalid: true },
            });

            await uniquenessAssessorAction.handler(
                mockRuntime,
                mockMessage,
                mockState,
                {},
                mockCallback
            );

            expect(mockCallback).toHaveBeenCalledWith(
                { text: "Failed to generate valid uniqueness assessment." },
                []
            );
        });
    });
});
