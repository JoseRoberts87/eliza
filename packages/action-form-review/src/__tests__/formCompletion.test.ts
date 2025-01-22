import { formCompletionAction } from "../formCompletion";

jest.mock("@elizaos/core");

type UUID = `${string}-${string}-${string}-${string}-${string}`;
enum ModelProviderName {
    OPENAI = "openai",
}

interface Memory {
    content: {
        text: string;
        type: string;
        data?: any;
    };
    userId: UUID;
    agentId: UUID;
    roomId: UUID;
}

interface State {
    bio: string;
    lore: string;
    messageDirections: string;
    postDirections: string;
    roomId: UUID;
    actors: string;
    recentMessages: string;
    recentMessagesData: any[];
}

interface IAgentRuntime {
    agentId: UUID;
    serverUrl: string;
    databaseAdapter: any;
    token: string | null;
    modelProvider: string;
    imageModelProvider: string;
    imageVisionModelProvider: string;
    character: any;
    providers: any[];
    actions: any[];
    evaluators: any[];
    plugins: any[];
    messageManager: any;
    descriptionManager: any;
    documentsManager: any;
    knowledgeManager: any;
    ragKnowledgeManager: any;
    loreManager: any;
    cacheManager: any;
    services: Map<string, any>;
    clients: Record<string, any>;
    getMemoryManager: jest.Mock;
    generateObject?: jest.Mock;
    initialize: () => Promise<void>;
    registerMemoryManager: () => void;
    getService: () => any;
    registerService: () => void;
    getSetting: () => string | null;
    getConversationLength: () => number;
    processActions: () => Promise<void>;
    evaluate: () => Promise<string[] | null>;
    ensureParticipantExists: () => Promise<void>;
    ensureUserExists: () => Promise<void>;
    registerAction: () => void;
    ensureConnection: () => Promise<void>;
    ensureParticipantInRoom: () => Promise<void>;
    ensureRoomExists: () => Promise<void>;
    composeState: () => Promise<State>;
    updateRecentMessageState: () => Promise<State>;
}

describe("formCompletionAction", () => {
    let mockRuntime: any;
    let mockCallback: jest.Mock;

    const userId = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" as UUID;
    const agentId = "yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy" as UUID;
    const roomId = "zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz" as UUID;

    beforeEach(() => {
        mockRuntime = {
            agentId,
            serverUrl: "",
            databaseAdapter: {},
            token: null,
            modelProvider: "openai",
            imageModelProvider: "openai",
            imageVisionModelProvider: "openai",
            character: {},
            providers: [],
            actions: [],
            evaluators: [],
            plugins: [],
            messageManager: {},
            descriptionManager: {},
            documentsManager: {},
            knowledgeManager: {},
            ragKnowledgeManager: {},
            loreManager: {},
            cacheManager: {},
            services: new Map(),
            clients: {},
            getMemoryManager: jest.fn().mockReturnValue({
                createMemory: jest.fn().mockResolvedValue(undefined),
            }),
            initialize: jest.fn().mockResolvedValue(undefined),
            registerMemoryManager: jest.fn(),
            getService: jest.fn(),
            registerService: jest.fn(),
            getSetting: jest.fn(),
            getConversationLength: jest.fn().mockReturnValue(0),
            processActions: jest.fn().mockResolvedValue(undefined),
            evaluate: jest.fn().mockResolvedValue(null),
            ensureParticipantExists: jest.fn().mockResolvedValue(undefined),
            ensureUserExists: jest.fn().mockResolvedValue(undefined),
            registerAction: jest.fn(),
            ensureConnection: jest.fn().mockResolvedValue(undefined),
            ensureParticipantInRoom: jest.fn().mockResolvedValue(undefined),
            ensureRoomExists: jest.fn().mockResolvedValue(undefined),
            composeState: jest.fn().mockResolvedValue({}),
            updateRecentMessageState: jest.fn().mockResolvedValue({}),
        };

        mockCallback = jest.fn();
    });

    describe("validate", () => {
        it("should return true for valid application message", async () => {
            const validMessage: Memory = {
                content: {
                    text: "Test Message",
                    type: "application",
                    data: {
                        companyName: "Test Company",
                        description: "Test Description",
                        founderDetails: [{ name: "Test Founder" }],
                    },
                },
                userId,
                agentId,
                roomId,
            };

            const result = await formCompletionAction.validate(
                mockRuntime,
                validMessage
            );
            expect(result).toBe(true);
        });

        it("should return false when message type is not application", async () => {
            const invalidMessage: Memory = {
                content: {
                    text: "Test Message",
                    type: "other",
                    data: {},
                },
                userId,
                agentId,
                roomId,
            };

            const result = await formCompletionAction.validate(
                mockRuntime,
                invalidMessage
            );
            expect(result).toBe(false);
        });

        it("should return false when message has no data", async () => {
            const invalidMessage: Memory = {
                content: {
                    text: "Test Message",
                    type: "application",
                },
                userId,
                agentId,
                roomId,
            };

            const result = await formCompletionAction.validate(
                mockRuntime,
                invalidMessage
            );
            expect(result).toBe(false);
        });
    });

    describe("handler", () => {
        const mockState = {
            bio: "Test Bio",
            lore: "Test Lore",
            messageDirections: "",
            postDirections: "",
            roomId,
            actors: "",
            recentMessages: "",
            recentMessagesData: [],
        } as any;

        it("should handle missing state", async () => {
            const message: Memory = {
                content: {
                    text: "Test Message",
                    type: "application",
                    data: {},
                },
                userId,
                agentId,
                roomId,
            };

            await formCompletionAction.handler(
                mockRuntime,
                message,
                undefined,
                {},
                mockCallback
            );

            expect(mockCallback).toHaveBeenCalledWith(
                {
                    text: "Failed to validate application: Missing state.",
                    type: "error",
                },
                []
            );
        });

        it("should process application with questions", async () => {
            const message: Memory = {
                content: {
                    text: "Test Message",
                    type: "application",
                    data: {
                        companyName: "Test Company",
                        description: "Test Description",
                        additionalInfo: {
                            questions: [
                                {
                                    question: "Test Question?",
                                    answer: "Test Answer",
                                },
                            ],
                        },
                    },
                },
                userId,
                agentId,
                roomId,
            };

            await formCompletionAction.handler(
                mockRuntime,
                message,
                mockState,
                {},
                mockCallback
            );

            expect(mockCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    text: expect.stringContaining("Form Validation Results"),
                }),
                []
            );
            expect(mockRuntime.getMemoryManager).toHaveBeenCalledWith(
                "form_validation"
            );
        });

        it("should handle errors gracefully", async () => {
            const message: Memory = {
                content: {
                    text: "Test Message",
                    type: "application",
                    data: {},
                },
                userId,
                agentId,
                roomId,
            };

            const { generateObject } = require("@elizaos/core");
            generateObject.mockRejectedValueOnce(new Error("Test error"));

            await formCompletionAction.handler(
                mockRuntime,
                message,
                mockState,
                {},
                mockCallback
            );

            expect(mockCallback).toHaveBeenCalledWith(
                {
                    text: "Failed to validate and analyze application. Please check the logs.",
                    type: "error",
                },
                []
            );
        });
    });
});
