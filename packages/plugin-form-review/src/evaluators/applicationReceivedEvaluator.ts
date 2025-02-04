import {
    type IAgentRuntime,
    type Memory,
    type Evaluator,
    type State,
    elizaLogger,
} from "@elizaos/core";

function isNewApplication(content: any) {
    // TODO: implement proper validation
    // determine what constitutes a new application
    // it should be things that can be included in the request
    return true;
}

elizaLogger.info("APPLICATION_RECEIVED_EVALUATOR loaded");

export const applicationReceivedEvaluator: Evaluator = {
    alwaysRun: true,
    name: "APPLICATION_RECEIVED_EVALUATOR",
    description: "Records new applications when they are received by Stacey",
    similes: ["NEW_APPLICATION_TRACKER", "APPLICATION_RECORDER"],
    validate: async (runtime: IAgentRuntime, memory: Memory, state: State) => {
        elizaLogger.info("APPLICATION_RECEIVED_EVALUATOR validator...");
        return isNewApplication(memory.content);
    },

    handler: async (runtime: IAgentRuntime, memory: Memory, state: State) => {
        elizaLogger.info("APPLICATION_RECEIVED_EVALUATOR handler...");
        try {
            if (!memory.content || typeof memory.content.text !== "string") {
                return {
                    score: 0,
                    reason: "Invalid memory content structure",
                };
            }

            if (memory.content.text.includes("received")) {
                elizaLogger.log("Important content found in memory.");
                return {
                    score: 1,
                    reason: "Memory contains important content.",
                };
            } else {
                elizaLogger.log("No important content found in memory.");
                return {
                    score: 0,
                    reason: "Memory does not contain important content.",
                };
            }
        } catch (error) {
            elizaLogger.error("Error in sampleEvaluator:", error);
            throw error;
        }
    },
    examples: [
        {
            context: "Recording a new application",
            messages: [
                {
                    user: "Stacey",
                    content: {
                        text: "New startup application submission",
                        action: "APPLICATION_FORM_RECEIVED",
                    },
                },
            ],
            outcome: `\`\`\`json
                {
                    "score": 1,
                    "reason": "Application receipt recorded successfully",
                    "action": "APPLICATION_FORM_RECEIVED"
                }
                \`\`\``,
        },
        {
            context:
                "Attempting to record an already dispositioned application",
            messages: [
                {
                    user: "{{user1}}",
                    content: {
                        type: "application",
                        text: "Processed application",
                        data: {
                            companyName: "DataFlow Systems",
                            disposition: {
                                status: "complete",
                                reviewer: "john",
                            },
                        },
                    },
                },
            ],
            outcome: `\`\`\`json
{
    "score": 0,
    "reason": "Not a new application",
    "action": null
}
\`\`\``,
        },
    ],
};
