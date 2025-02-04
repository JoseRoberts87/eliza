import {
    type Action,
    type IAgentRuntime,
    type Memory,
    type HandlerCallback,
    type State,
    elizaLogger,
} from "@elizaos/core";

interface ApplicationForm {
    companyName: string;
    description?: string;
    [key: string]: any;
}

function isApplicationForm(data: any): data is ApplicationForm {
    // TODO: implement proper Application Form
    
    // return (
    //     typeof data === "object" &&
    //     data !== null &&
    //     typeof data.companyName === "string"
    // );
    return (data !== null)
}

elizaLogger.info("APPLICATION_FORM_RECEIVED loaded");

export const applicationReceivedAction: Action = {
    name: "APPLICATION_FORM_RECEIVED",
    similes: ["APPLICATION_RECEIVED", "NEW_APPLICATION"],
    description: "Records receipt of a new application form and creates a memory entry",

    validate: async (runtime: IAgentRuntime, message: Memory) => {
        const content = message.content;
        elizaLogger.info("APPLICATION_FORM_RECEIVED validator...");
        // return (
        //     content?.type === "application" &&
        //     isApplicationForm(content.data) &&
        //     !content.data.disposition // Ensure it hasn't been dispositioned yet
        // );

        return true;
    },

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State,
        _options?: object,
        callback?: HandlerCallback
    ) => {
        elizaLogger.info("APPLICATION_FORM_RECEIVED handler...");
        try {
            const applicationData = message.content.attachments;

            elizaLogger.info(applicationData[0].text);
            
            if (!isApplicationForm(applicationData)) {
                callback(
                    { text: "Invalid application form format." },
                    []
                );
                return;
            }

            // Create memory entry for the received application
            await runtime.messageManager.createMemory({
                id: message.id,
                content: {
                    action: "APPLICATION_FORM_RECEIVED",
                    text: `New application received from `,
                },
                roomId: message.roomId,
                userId: message.userId,
                agentId: runtime.agentId
            });

            // Send acknowledgment response
            callback(
                {
                    text: `Thank you for submitting your application${applicationData.companyName ? ` for ${applicationData.companyName}` : ''}! I've recorded your submission and will begin the review process. You'll receive updates as your application progresses through our evaluation stages.`,
                    action: "FORM_RECEIVED"
                },
                []
            );

        } catch (error) {
            elizaLogger.error("Error processing application form:", error);
            callback(
                { text: "There was an error processing your application. Please try again or contact support." },
                []
            );
        }
    },

    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Submitting new application",
                    data: {
                        companyName: "TechVision AI",
                        description: "AI-powered workflow automation platform"
                    }
                }
            },
            {
                user: "stacey",
                content: {
                    text: "Thank you for submitting your application for TechVision AI! I've recorded your submission and will begin the review process. You'll receive updates as your application progresses through our evaluation stages.",
                    action: "FORM_RECEIVED"
                }
            }
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    type: "application",
                    text: "New startup submission",
                    data: {
                        companyName: "DataFlow Systems",
                        description: "Enterprise data pipeline solution",
                        teamSize: 5,
                        fundingStage: "Seed"
                    }
                }
            },
            {
                user: "stacey",
                content: {
                    text: "Thank you for submitting your application for DataFlow Systems! I've recorded your submission and will begin the review process. You'll receive updates as your application progresses through our evaluation stages.",
                    action: "FORM_RECEIVED"
                }
            }
        ]
    ]
};
