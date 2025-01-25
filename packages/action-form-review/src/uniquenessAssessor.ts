import {
    Action,
    IAgentRuntime,
    Memory,
    State,
    HandlerCallback,
    composeContext,
    generateObject,
    ModelClass,
    elizaLogger,
} from "@elizaos/core";

import {
    UniquenessAssessmentSchema,
    isUniquenessAssessmentResult,
} from "./types";

const uniquenessTemplate = `Analyze the application for uniqueness and innovation:

Company: {{companyName}}
Description: {{description}}
Additional Info: {{additionalInfo}}

Consider:
1. Innovation level in the proposed solution
2. Market differentiation
3. Unique value proposition
4. Technical novelty
5. Business model innovation

Compare with existing applications in memory to:
- Identify similar applications
- Highlight unique aspects
- Assess market positioning
- Evaluate technical differentiation`;

export const uniquenessAssessorAction: Action = {
    name: "ASSESS_UNIQUENESS",
    similes: ["CHECK_UNIQUENESS", "EVALUATE_INNOVATION", "ANALYZE_NOVELTY"],
    description:
        "Evaluates the uniqueness and innovation level of VC Accelerator applications",

    validate: async (runtime: IAgentRuntime, message: Memory) => {
        // Validate that we have access to the memory system for comparison
        const memoryManager = runtime.getMemoryManager(
            "uniqueness_assessments"
        );
        return !!memoryManager;
    },

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State,
        options?: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<unknown> => {
        if (!state || !callback) {
            return;
        }

        try {
            // Compose context for the assessment
            const context = composeContext({
                state,
                template: uniquenessTemplate,
            });

            // Generate uniqueness assessment
            const assessment = await generateObject({
                runtime,
                context,
                modelClass: ModelClass.LARGE, // Using large model for better semantic analysis
                schema: UniquenessAssessmentSchema,
            });

            if (!isUniquenessAssessmentResult(assessment.object)) {
                callback(
                    { text: "Failed to generate valid uniqueness assessment." },
                    []
                );
                return;
            }

            // Store assessment in memory for future reference
            const memoryManager = runtime.getMemoryManager(
                "uniqueness_assessments"
            );
            if (!memoryManager) {
                callback({ text: "Memory manager is not available." }, []);
                return;
            }

            const assessmentMemory: Memory = {
                id: message.id,
                userId: message.userId,
                agentId: runtime.agentId,
                roomId: message.roomId,
                content: {
                    text: JSON.stringify(assessment.object),
                    type: "uniqueness_assessment",
                    applicationId: state.applicationId,
                    timestamp: new Date().toISOString(),
                },
            };

            await memoryManager.createMemory(assessmentMemory);

            // Prepare response message
            const responseText = `Uniqueness Assessment Complete:

Innovation Score: ${assessment.object.innovationScore}/100
Uniqueness Score: ${assessment.object.uniquenessScore}/100

Key Innovative Aspects:
${assessment.object.innovativeAspects.map((aspect) => `- ${aspect}`).join("\n")}

Market Differentiators:
${assessment.object.marketDifferentiators.map((diff) => `- ${diff}`).join("\n")}

Similar Applications Found: ${assessment.object.similarApplications.length}
${assessment.object.similarApplications
    .map(
        (app) =>
            `- Application ${app.id} (${app.similarity}% similar)
     Matching aspects: ${app.matchingAspects.join(", ")}`
    )
    .join("\n")}

Recommendations:
${assessment.object.recommendations.map((rec) => `- ${rec}`).join("\n")}`;

            callback({ text: responseText }, []);
            return;
        } catch (error) {
            elizaLogger.error("Error in uniqueness assessment:", error);
            if (callback) {
                callback(
                    {
                        text: "Failed to complete uniqueness assessment. Please check the logs.",
                    },
                    []
                );
            }
            return;
        }
    },

    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Please assess the uniqueness of our AI-powered supply chain optimization platform.",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "I'll analyze the uniqueness and innovation of your platform.",
                    action: "ASSESS_UNIQUENESS",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "How does our blockchain-based identity verification solution compare to existing applications?",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "I'll evaluate the uniqueness of your identity verification solution.",
                    action: "ASSESS_UNIQUENESS",
                },
            },
        ],
    ],
};
