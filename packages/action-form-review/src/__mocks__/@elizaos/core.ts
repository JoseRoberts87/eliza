export const ModelClass = {
    SMALL: "small",
};

export const elizaLogger = {
    error: jest.fn(),
};

export const ModelProviderName = {
    OPENAI: "openai",
};

export const composeContext = jest.fn().mockReturnValue("mocked context");

export const generateObject = jest.fn().mockResolvedValue({
    object: {
        isComplete: true,
        score: 85,
        analysis: { quality: 90 },
        feedback: ["Good response"],
        followUpQuestions: ["What's next?"],
    },
});
