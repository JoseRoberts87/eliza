import {
    Action,
    IAgentRuntime,
    Memory,
    State,
    HandlerCallback,
    ModelClass,
    Content,
    elizaLogger,
} from "@elizaos/core";
import { z } from "zod";
import { composeContext, generateObject } from "@elizaos/core";

// Schema for the analysis result
const AnswerAnalysisSchema = z.object({
    quality: z
        .number()
        .min(0)
        .max(100)
        .describe(
            "Quality score from 0-100 based on depth, clarity and relevance"
        ),
    relevance: z
        .number()
        .min(0)
        .max(100)
        .describe(
            "Relevance score from 0-100 based on how well it answers the question"
        ),
    feedback: z
        .string()
        .describe(
            "Detailed feedback on the answer quality and areas for improvement"
        ),
});

// Template for analyzing answers
const analyzeAnswerTemplate = `
Analyze the following answer to an additional question in a VC Accelerator application.
Focus on:
1. Quality - depth, clarity and thoughtfulness of response
2. Relevance - how well it addresses the specific question
3. Areas for improvement

Question: {{question}}
Answer: {{answer}}

Provide a detailed analysis with specific scores and actionable feedback.
`;

elizaLogger.info("ANALYZE_ADDITIONAL_QUESTIONS loaded");

export const questionsAnalyzerAction: Action = {
    name: "ANALYZE_ADDITIONAL_QUESTIONS",
    similes: ["REVIEW_QUESTIONS", "EVALUATE_ANSWERS", "ASSESS_RESPONSES"],
    description:
        "Analyzes responses to additional questions in VC Accelerator applications using AI-powered analysis to evaluate quality and relevance",

    validate: async (runtime: IAgentRuntime, message: Memory) => {
        // Validate that we have question and answer content to analyze
        // const content = message.content as Content;
        // return !!(content.question && content.answer);
        return true;
    },

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State,
        _options?: any,
        callback?: HandlerCallback
    ) => {
        elizaLogger.info("ANALYZE_ADDITIONAL_QUESTIONS called");

        try {
            const content = message.content as Content;

            if (!state) {
                if (callback) {
                    callback(
                        {
                            text: "Failed to validate application: Missing state.",
                            type: "error",
                        },
                        []
                    );
                }
                return;
            }

            // Compose context for analysis
            const context = composeContext({
                state,
                template: analyzeAnswerTemplate,
                templatingEngine: "handlebars",
                // variables: {
                //     question: content.question,
                //     answer: content.answer,
                // },
            });

            // Generate analysis using AI
            const analysis = await generateObject({
                runtime,
                context,
                modelClass: ModelClass.SMALL,
                schema: AnswerAnalysisSchema,
                schemaName: "AnswerAnalysisSchema",
                schemaDescription: "Schema for analyzing answers to questions",
                mode: "json",
            });

            const result = AnswerAnalysisSchema.parse(analysis.object);

            // Store analysis in memory for future reference
            await runtime.messageManager.createMemory({
                userId: message.userId,
                roomId: message.roomId,
                agentId: runtime.agentId,
                content: {
                    text: "Question Analysis",
                    analysis: result,
                    originalQuestion: content.question,
                    originalAnswer: content.answer,
                },
            });

            // Return analysis results
            if (callback) {
                callback(
                    {
                        text: `Analysis complete:
                        Quality Score: ${result.quality}/100
                        Relevance Score: ${result.relevance}/100
                        Feedback: ${result.feedback}`,
                        action: "ANALYZE_ADDITIONAL_QUESTIONS",
                        analysis: result,
                    },
                    []
                );
            }
        } catch (error) {
            if (callback) {
                callback(
                    {
                        text: "Failed to analyze the question response. Please try again.",
                        error:
                            error instanceof Error
                                ? error.message
                                : String(error),
                    },
                    []
                );
            }
        }
    },

    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Please analyze this response",
                    question: "What is your go-to-market strategy?",
                    answer: "We plan to initially target small businesses through direct sales and partnerships with industry associations. Our pilot program with 5 companies showed strong product-market fit.",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: `Analysis complete:
Quality Score: 85/100
Relevance Score: 90/100

Feedback: Strong response with clear strategy and validation through pilot program. Could be improved by including more details on partnership strategy and scaling plans.`,
                    action: "ANALYZE_ADDITIONAL_QUESTIONS",
                },
            },
        ],
    ],
};
