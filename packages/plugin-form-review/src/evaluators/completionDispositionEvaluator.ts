import { type IAgentRuntime, type Memory, type Evaluator, elizaLogger } from "@elizaos/core";

interface ApplicationDisposition {
    reviewer: string;
    status: "complete" | "incomplete";
    timestamp: string;
    missingFields?: string[];
}

interface ApplicationData {
    disposition: ApplicationDisposition;
    [key: string]: any;
}

interface ApplicationContent {
    type: "application";
    text: string;
    data: ApplicationData;
}

function isApplicationContent(content: any): content is ApplicationContent {
    return (
        content?.type === "application" &&
        typeof content?.text === "string" &&
        content?.data?.disposition !== undefined
    );
}

const completionDispositionEvaluator: Evaluator = {
    name: "COMPLETION_DISPOSITION_EVALUATOR",
    similes: ["FORM_COMPLETION_CHECK", "DISPOSITION_VALIDATOR"],
    description: "Evaluates if an application has been properly dispositioned by John and routes complete applications to David",
    alwaysRun: false,

    validate: async (runtime: IAgentRuntime, message: Memory) => {
        if (!isApplicationContent(message.content)) {
            return false;
        }
        return message.content.data.disposition.reviewer === "john";
    },

    handler: async (runtime: IAgentRuntime, message: Memory) => {
        elizaLogger.info("Evaluating application disposition...");
        try {
            if (!isApplicationContent(message.content)) {
                return {
                    score: 0,
                    reason: "Invalid application content format",
                    action: null
                };
            }

            const disposition = message.content.data.disposition;
            
            if (disposition.reviewer !== "john") {
                return {
                    score: 0,
                    reason: "Application not reviewed by John",
                    action: null
                };
            }

            if (disposition.status === "complete") {
                // Route to David for questions analysis
                await runtime.messageManager.createMemory({
                    id: message.id,
                    content: {
                        type: "application",
                        text: `Application routed to David for review: ${message.id}`,
                        data: message.content.data,
                        routedTo: "david",
                        previousDisposition: disposition
                    },
                    roomId: message.roomId,
                    userId: message.userId,
                    agentId: runtime.agentId
                });

                return {
                    score: 1,
                    reason: "Application complete and routed to David for questions analysis",
                    action: "ROUTE_TO_DAVID"
                };
            }

            return {
                score: 0.5,
                reason: `Application disposition: ${disposition.status}. Requires completion before routing to David.`,
                action: null
            };
        } catch (error) {
            elizaLogger.error("Error in completionDispositionEvaluator:", error);
            throw error;
        }
    },

    examples: [
        {
            context: "Checking complete application disposition",
            messages: [
                {
                    user: "{{user1}}",
                    content: {
                        type: "application",
                        text: "Application submission for review",
                        data: {
                            disposition: {
                                reviewer: "john",
                                status: "complete",
                                timestamp: "2024-03-15T10:00:00Z"
                            }
                        }
                    }
                }
            ],
            outcome: `\`\`\`json
{
    "score": 1,
    "reason": "Application complete and routed to David for questions analysis",
    "action": "ROUTE_TO_DAVID"
}
\`\`\``
        },
        {
            context: "Checking incomplete application disposition",
            messages: [
                {
                    user: "{{user1}}",
                    content: {
                        type: "application",
                        text: "Application submission for review",
                        data: {
                            disposition: {
                                reviewer: "john",
                                status: "incomplete",
                                timestamp: "2024-03-15T10:00:00Z",
                                missingFields: ["technicalTeam", "problemStatement"]
                            }
                        }
                    }
                }
            ],
            outcome: `\`\`\`json
{
    "score": 0.5,
    "reason": "Application disposition: incomplete. Requires completion before routing to David.",
    "action": null
}
\`\`\``
        }
    ]
};

export default completionDispositionEvaluator; 
