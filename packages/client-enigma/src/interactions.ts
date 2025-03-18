import { type IAgentRuntime, Memory, elizaLogger } from "@elizaos/core";
import { ClientBase } from "./base";
import { DatabaseService } from "./database";
import { ApplicationStatus, Application, Submission } from "./type";
import { EmailContent } from "@elizaos/client-email";
import * as fs from "fs";
export class EnigmaInteractionClient {
    client: ClientBase;
    runtime: IAgentRuntime;
    private isDryRun: boolean;
    db: DatabaseService;
    currentApplication: Application;

    constructor(client: ClientBase, runtime: IAgentRuntime) {
        this.client = client;
        this.runtime = runtime;
        this.isDryRun = this.client.config.ENIGMA_DRY_RUN || false;
        this.currentApplication = null;
    }

    async start() {
        const handleInteractionsLoop = () => {
            this.handleInteractions();
            setTimeout(
                handleInteractionsLoop,
                // Use the configured poll interval
                this.client.config.ENIGMA_POLL_INTERVAL * 200
            );
        };
        handleInteractionsLoop();
    }

    async handleInteractions() {
        elizaLogger.info("Checking Enigma interactions...");
        try {
            elizaLogger.info("Processing interactions...");

            const uniqueApplication: Application =
                await this.client.db.getApplicationByStatus(
                    ApplicationStatus.RECEIVED
                );
            if (
                this.runtime.character.name === "yconicReceiver" &&
                uniqueApplication.status === ApplicationStatus.RECEIVED
            ) {
                const submission: Submission = JSON.parse(
                    uniqueApplication.message
                );
                const success = await this.callYconicAgent(
                    "yconicReceiver",
                    "550e8400-e29b-41d4-a716-446655440004",
                    "SCORE_GENERATOR",
                    submission
                );
                if (success) {
                    await this.client.db.updateApplicationStatus(
                        uniqueApplication.id,
                        ApplicationStatus.SCORED
                    );
                }
            }

            const scoredApplication: Application =
                await this.client.db.getApplicationByStatus(
                    ApplicationStatus.SCORED
                );
            elizaLogger.info("scoredApplication:", scoredApplication.status, this.runtime.character.name);
            if (
                this.runtime.character.name === "yconicScore" &&
                scoredApplication.status === ApplicationStatus.SCORED
            ) {
                const submission: Submission = JSON.parse(
                    scoredApplication.message
                );
                const success = await this.callYconicAgent(
                    "yconicScore",
                    "550e8400-e29b-41d4-a716-446655440005",
                    "ACCEPT_APPLICATION",
                    submission
                );

                if (success) {
                    try {
                        elizaLogger.info("runtime.agentId@@@@:", this.runtime.agentId);
                        const emailContent: EmailContent = {
                            to: "webterpr@gmail.com",
                            subject: "Yconic Application Accepted",
                            text: "Congratulations! Your application has been accepted. Please follow the instructions to complete the process.",
                        };

                        elizaLogger.info(this.runtime.clients.email);
                        elizaLogger.info("this.runtime.clients.email:")


                        this.runtime.clients.email.sendEmail(emailContent);
                        elizaLogger.info("Email sent...");

                        // await this.client.db.updateApplicationStatus(
                        //     scoredApplication.id,
                        //     ApplicationStatus.ACCEPTED
                        // );

                        elizaLogger.info(
                            "#######################################"
                        );
                        elizaLogger.info("CONGRATULATIONS!!!!!!!!!!!!");
                        elizaLogger.info(
                            "#######################################"
                        );
                    } catch (error) {
                        elizaLogger.error("Error sending email:", error);
                    }
                } else {
                    elizaLogger.error("Error accepting application");
                }
            }
        } catch (error) {
            elizaLogger.error("Error handling Enigma interactions:", error);
        }
    }

    async callYconicAgent(
        agentName: string,
        agentId: string,
        agentAction: string,
        submisison: Submission
    ): Promise<boolean> {
        elizaLogger.info("Calling Yconic completion...");

        const fileContent = new Blob([
            fs.readFileSync(submisison.attachments[0].url),
        ]);

        const requestOptions: RequestInit = {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                text: agentAction,
                user: agentName,
                file: fileContent,
            }),
            redirect: "follow",
        };

        elizaLogger.info(requestOptions);
        let success: boolean = false;

        try {
            await fetch(
                `http://localhost:3000/${agentId}/message`,
                requestOptions
            )
                .then((response) => response.text())
                .then((result) =>
                    elizaLogger.info("Validation response:", result)
                )
                .catch((error) =>
                    elizaLogger.error("Error calling validation:", error)
                );

            success = true;
        } catch (error) {
            elizaLogger.error("Error calling validation:", error);
            success = false;
        }
        return success;
    }
}
