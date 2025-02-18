import {
    type Action,
    type IAgentRuntime,
    type Memory,
    type HandlerCallback,
    type State,
    stringToUuid,
    elizaLogger,
    Content,
} from "@elizaos/core";

import {
    ApplicationStatus,
    DatabaseService,
    type Application,
} from "@elizaos/client-enigma";

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
    return data !== null;
}

async function callYconicCompletion(message: Memory) {
    elizaLogger.info("Calling Yconic completion...");
    const formdata = new FormData();
    formdata.append("text", "Submitting complete application for review");
    formdata.append("user", "yconicReceiver");

    // Format the application data to match the expected format for validation
    const applicationContent = {
        type: "application",
        text: "Submitting complete application for review",
        data: message.content.attachments[0],
    };

    const requestOptions: RequestInit = {
        method: "POST",
        body: JSON.stringify({
            content: applicationContent,
            action: "VALIDATE_APPLICATION_FORM",
        }),
        redirect: "follow",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
        },
    };

    await fetch(
        "http://localhost:3000/550e8400-e29b-41d4-a716-446655440001/message",
        requestOptions
    )
        .then((response) => response.text())
        .then((result) => elizaLogger.info("Validation response:", result))
        .catch((error) =>
            elizaLogger.error("Error calling validation:", error)
        );
}

elizaLogger.info("APPLICATION_FORM_RECEIVED loaded");

export const applicationReceivedAction: Action = {
    name: "APPLICATION_FORM_RECEIVED",
    similes: ["APPLICATION_RECEIVED", "NEW_APPLICATION"],
    description:
        "Records receipt of a new application form and creates a memory entry",

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

            if (!isApplicationForm(applicationData)) {
                callback({ text: "Invalid application form format." }, []);
                return;
            }

            const messageId = stringToUuid(Date.now().toString());

            const content: Content = {
                text: `New application received from ${applicationData.companyName}`,
                attachments: [],
                source: "direct",
                inReplyTo: undefined,
            };

            const userMessage = {
                content,
                userId: message.userId,
                roomId: message.userId,
                agentId: runtime.agentId,
            };

            // Create memory entry for the received application
            await runtime.messageManager.createMemory({
                id: stringToUuid(messageId + "-" + runtime.agentId),
                ...userMessage,
                roomId: message.roomId,
                userId: message.userId,
                content: content,
                agentId: runtime.agentId,
                createdAt: Date.now(),
            });

            const application: Application = {
                id: stringToUuid(messageId + "-" + runtime.agentId),
                companyName: "applicationData.companyName",
                createdAt: Date.now(),
                updatedAt: Date.now(),
                updatedBy: runtime.agentId,
                status: ApplicationStatus.RECEIVED,
            };

            try {
                // TODO: remove logs that are not needed

                const client = new DatabaseService();
                // elizaLogger.info("Inserting application into database...");
                await client.insertApplication(application);
                elizaLogger.info("Application inserted into database");
            } catch (error) {
                elizaLogger.info(error);
                elizaLogger.error(
                    "Error inserting application into database:",
                    error
                );
            }

            // Send acknowledgment response
            callback(
                {
                    text: `Thank you for submitting your application${
                        applicationData.companyName
                            ? ` for ${applicationData.companyName}`
                            : ""
                    }! I've recorded your submission and will begin the review process. You'll receive updates as your application progresses through our evaluation stages.`,
                    action: "FORM_RECEIVED",
                },
                []
            );
        } catch (error) {
            elizaLogger.error("Error processing application form:", error);
            callback(
                {
                    text: "There was an error processing your application. Please try again or contact support.",
                },
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
                        description: "AI-powered workflow automation platform",
                    },
                },
            },
            {
                user: "stacey",
                content: {
                    text: "Thank you for submitting your application for TechVision AI! I've recorded your submission and will begin the review process. You'll receive updates as your application progresses through our evaluation stages.",
                    action: "FORM_RECEIVED",
                },
            },
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
                        fundingStage: "Seed",
                    },
                },
            },
            {
                user: "stacey",
                content: {
                    text: "Thank you for submitting your application for DataFlow Systems! I've recorded your submission and will begin the review process. You'll receive updates as your application progresses through our evaluation stages.",
                    action: "FORM_RECEIVED",
                },
            },
        ],
    ],
};
