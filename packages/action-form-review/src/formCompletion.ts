import {
    Action,
    IAgentRuntime,
    Memory,
    HandlerCallback,
    State,
    composeContext,
    generateObject,
    ModelClass,
    elizaLogger,
} from "@elizaos/core";

import {
    FormCompletionSchema,
    FormCompletionResult,
    isFormCompletionResult,
    QuestionAnalysisSchema,
} from "./types";
import { formCompletionTemplate, questionAnalysisTemplate } from "./templates";
import { z } from "zod";

export const formCompletionAction: Action = {
    name: "VALIDATE_APPLICATION_FORM",
    similes: [
        "CHECK_APPLICATION_FORM",
        "VERIFY_APPLICATION_FORM",
        "ANALYZE_APPLICATION_QUESTIONS",
    ],
    description:
        "Validates and analyzes VC Accelerator applications, including form completion and detailed question analysis",

    validate: async (runtime: IAgentRuntime, message: Memory) => {
        // Validate that we have an application to check
        return (
            message.content?.type === "application" && !!message.content.data
        );
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State,
        _options?: any,
        callback?: HandlerCallback
    ) => {
        try {
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
            // First, validate form completion
            const formContext = composeContext({
                state,
                template: formCompletionTemplate,
            });

            const formValidation = await generateObject({
                runtime,
                context: formContext,
                modelClass: ModelClass.SMALL,
                schema: FormCompletionSchema,
            });

            const formResult = formValidation.object as z.infer<
                typeof FormCompletionSchema
            >;

            // If there are additional questions, analyze them
            let questionAnalysis = undefined;
            const applicationData = message.content.data as Record<string, any>;
            if (applicationData?.additionalInfo?.questions) {
                const questionContext = composeContext({
                    state,
                    template: questionAnalysisTemplate,
                });

                const analysisResult = await generateObject({
                    runtime,
                    context: questionContext,
                    modelClass: ModelClass.SMALL,
                    schema: QuestionAnalysisSchema,
                });

                const analysis = analysisResult.object as z.infer<
                    typeof QuestionAnalysisSchema
                >;
                questionAnalysis = {
                    overallScore: analysis.analysis.quality,
                    analyses: [analysis],
                    summary: analysis.feedback.join("\n"),
                    recommendations: analysis.followUpQuestions || [],
                };
            }

            const result: FormCompletionResult = {
                isComplete: !!formResult,
                missingFields: formResult ? [] : ["form data"],
                validationErrors: formResult ? [] : ["invalid form data"],
                score: formResult ? 100 : 0,
                questionAnalysis,
            };

            if (!isFormCompletionResult(result)) {
                if (callback) {
                    callback(
                        {
                            text: "Failed to validate and analyze application. Invalid result format.",
                            type: "error",
                        },
                        []
                    );
                }
                return;
            }

            // Store result in memory
            const memoryManager = runtime.getMemoryManager("form_validation");
            if (memoryManager) {
                await memoryManager.createMemory({
                    content: {
                        type: "form_validation",
                        text: JSON.stringify(result),
                        data: result,
                    },
                    roomId: message.roomId,
                    userId: message.userId,
                    agentId: runtime.agentId,
                    unique: true,
                });
            }

            // Generate response message
            let responseText = `Form Validation Results:
            - Completion Status: ${result.isComplete ? "Complete" : "Incomplete"}
            - Score: ${result.score}/100
            ${result.missingFields.length > 0 ? `\nMissing Fields:\n${result.missingFields.map((f) => `- ${f}`).join("\n")}` : ""}
            ${result.validationErrors.length > 0 ? `\nValidation Errors:\n${result.validationErrors.map((e) => `- ${e}`).join("\n")}` : ""}`;

            if (result.questionAnalysis) {
                responseText += `\n\nQuestion Analysis:
            - Overall Score: ${result.questionAnalysis.overallScore}/100
            - Summary: ${result.questionAnalysis.summary}
            ${result.questionAnalysis.recommendations.length > 0 ? `\nRecommendations:\n${result.questionAnalysis.recommendations.map((r) => `- ${r}`).join("\n")}` : ""}`;
            }

            if (callback) {
                callback({ text: responseText }, []);
            }
        } catch (error) {
            elizaLogger.error(
                "Error validating and analyzing application:",
                error
            );
            if (callback) {
                callback(
                    {
                        text: "Failed to validate and analyze application. Please check the logs.",
                        type: "error",
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
                    text: "Submitting application for review",
                    type: "application",
                    data: {
                        companyName: "TechCorp",
                        description:
                            "A comprehensive description of the company and its innovative technology...",
                        founderDetails: [
                            {
                                name: "John Doe",
                                email: "john@techcorp.com",
                                role: "CEO",
                            },
                        ],
                        additionalInfo: {
                            questions: [
                                {
                                    id: "q1",
                                    question: "What is your target market?",
                                    answer: "Our target market includes enterprise software companies...",
                                },
                            ],
                        },
                    },
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Form Validation Results:\n- Completion Status: Complete\n- Score: 85/100\n\nQuestion Analysis:\n- Overall Score: 90/100\n- Summary: Strong market understanding with clear focus",
                    action: "VALIDATE_APPLICATION_FORM",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Submitting incomplete application",
                    type: "application",
                    data: {
                        companyName: "StartupX",
                        description: "Too short",
                        founderDetails: [],
                        additionalInfo: {
                            questions: [
                                {
                                    id: "q1",
                                    question: "What is your target market?",
                                    answer: "Everyone",
                                },
                            ],
                        },
                    },
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Form Validation Results:\n- Completion Status: Incomplete\n- Score: 30/100\nMissing Fields:\n- Founder Details\nValidation Errors:\n- Description too short\n\nQuestion Analysis:\n- Overall Score: 40/100\n- Summary: Response lacks specificity and market understanding",
                    action: "VALIDATE_APPLICATION_FORM",
                },
            },
        ],
    ],
};
