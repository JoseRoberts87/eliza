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
} from "./types";
import { formCompletionTemplate } from "./templates";
import { z } from "zod";

export const formCompletionAction: Action = {
    name: "VALIDATE_APPLICATION_FORM",
    similes: ["CHECK_APPLICATION_FORM", "VERIFY_APPLICATION_FORM"],
    description:
        "Validates VC Accelerator applications by checking form completion and required fields",

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
        elizaLogger.info("VALIDATE_APPLICATION_FORM");

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

            // Validate form completion
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

            const result: FormCompletionResult = {
                isComplete: !!formResult,
                missingFields: formResult ? [] : ["form data"],
                validationErrors: formResult ? [] : ["invalid form data"],
                score: formResult ? 100 : 0,
            };

            if (!isFormCompletionResult(result)) {
                if (callback) {
                    callback(
                        {
                            text: "Failed to validate application. Invalid result format.",
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

            if (callback) {
                callback({ text: responseText }, []);
            }
        } catch (error) {
            elizaLogger.error("Error validating application:", error);
            if (callback) {
                callback(
                    {
                        text: "Failed to validate application. Please check the logs.",
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
                    },
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Form Validation Results:\n- Completion Status: Complete\n- Score: 100/100",
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
                    },
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Form Validation Results:\n- Completion Status: Incomplete\n- Score: 30/100\nMissing Fields:\n- Founder Details\nValidation Errors:\n- Description too short",
                    action: "VALIDATE_APPLICATION_FORM",
                },
            },
        ],
    ],
};
