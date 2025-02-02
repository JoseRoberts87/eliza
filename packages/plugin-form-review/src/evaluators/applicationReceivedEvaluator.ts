import { type IAgentRuntime, type Memory, type Evaluator, elizaLogger } from "@elizaos/core";

interface ApplicationContent {
    type: "application";
    text: string;
    data: Record<string, any>;
}

function isNewApplication(content: any): content is ApplicationContent {
    // TODO: implement proper validation
    // determine what constitutes a new application
    // it should be things that can be included in the request
    return true;
}

elizaLogger.info("APPLICATION_RECEIVED_EVALUATOR loaded");

export const applicationReceivedEvaluator: Evaluator = {
    name: "APPLICATION_RECEIVED_EVALUATOR",
    similes: ["NEW_APPLICATION_TRACKER", "APPLICATION_RECORDER"],
    description: "Records new applications when they are received by Stacey",
    alwaysRun: false,

    validate: async (runtime: IAgentRuntime, message: Memory) => {
        elizaLogger.info("Validating new application received...");
        // TODO: should call isNewApplication(message.content);
        return true;
    },

    handler: async (runtime: IAgentRuntime, message: Memory) => {
        elizaLogger.info("Recording new application receipt...");
        try {
            if (!isNewApplication(message.content)) {
                return {
                    score: 0,
                    reason: "Not a new application",
                    action: null
                };
            }

            // Record the application receipt in memory
            await runtime.messageManager.createMemory({
                id: message.id,
                content: {
                    type: "application",
                    text: `New application received: ${message.id}`,
                    data: {
                        ...message.content.data,
                        disposition: {
                            status: "received",
                            timestamp: new Date().toISOString(),
                            receivedBy: "stacey"
                        }
                    }
                },
                roomId: message.roomId,
                userId: message.userId,
                agentId: runtime.agentId
            });

            return {
                score: 1,
                reason: "Application receipt recorded successfully",
                action: "APPLICATION_RECEIVED"
            };
        } catch (error) {
            elizaLogger.error("Error in applicationReceivedEvaluator:", error);
            throw error;
        }
    },

    examples: [
        {
            context: "Recording a new application",
            messages: [
                {
                    user: "{{user1}}",
                    content: {
                        type: "application",
                        text: "New startup application submission",
                        data: {
                            companyName: "TechVision AI",
                            description: "AI-powered workflow automation"
                        }
                    }
                }
            ],
            outcome: `\`\`\`json
{
    "score": 1,
    "reason": "Application receipt recorded successfully",
    "action": "APPLICATION_RECEIVED"
}
\`\`\``
        },
        {
            context: "Attempting to record an already dispositioned application",
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
                                reviewer: "john"
                            }
                        }
                    }
                }
            ],
            outcome: `\`\`\`json
{
    "score": 0,
    "reason": "Not a new application",
    "action": null
}
\`\`\``
        }
    ]
};
