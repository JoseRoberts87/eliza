import { type IAgentRuntime, Memory, elizaLogger } from "@elizaos/core";
import { ClientBase } from "./base";
import { DatabaseService } from "./database";
import { ApplicationStatus, Application, Submission } from "./type";
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
        elizaLogger.info(this.runtime.character.name);
        try {
            elizaLogger.info("Processing interactions...");

            const receivedApplication: Application =
                await this.client.db.getApplicationByStatus(
                    ApplicationStatus.RECEIVED
                );
            if (
                this.runtime.character.name === "yconicReceiver" &&
                receivedApplication.status === ApplicationStatus.RECEIVED
            ) {
                const submission: Submission = JSON.parse(
                    receivedApplication.message
                );
                const success = await this.callYconicAgent(
                    "yconicReceiver",
                    "550e8400-e29b-41d4-a716-446655440001",
                    "VALIDATE_APPLICATION_FORM",
                    submission
                );
                if (success) {
                    await this.client.db.updateApplicationStatus(
                        receivedApplication.id,
                        ApplicationStatus.FORM_COMPLETED
                    );
                }
            }

            const completedApplication: Application =
                await this.client.db.getApplicationByStatus(
                    ApplicationStatus.FORM_COMPLETED
                );
            if (
                this.runtime.character.name === "yconicCompletion" &&
                completedApplication.status === ApplicationStatus.FORM_COMPLETED
            ) {
                const submission: Submission = JSON.parse(
                    completedApplication.message
                );
                const success = await this.callYconicAgent(
                    "yconicCompletion",
                    "550e8400-e29b-41d4-a716-446655440002",
                    "ANALYZE_ADDITIONAL_QUESTIONS",
                    submission
                );
                if (success) {
                    await this.client.db.updateApplicationStatus(
                        completedApplication.id,
                        ApplicationStatus.ADDITIONAL_QUESTIONS
                    );
                }
            }

            const AdditionalQuestonsApplication: Application =
                await this.client.db.getApplicationByStatus(
                    ApplicationStatus.ADDITIONAL_QUESTIONS
                );
            if (
                this.runtime.character.name === "yconicSupplemental" &&
                AdditionalQuestonsApplication.status ===
                    ApplicationStatus.ADDITIONAL_QUESTIONS
            ) {
                const submission: Submission = JSON.parse(
                    AdditionalQuestonsApplication.message
                );
                const success = await this.callYconicAgent(
                    "yconicSupplemental",
                    "550e8400-e29b-41d4-a716-446655440003",
                    "ASSESS_UNIQUENESS",
                    submission
                );
                if (success) {
                    await this.client.db.updateApplicationStatus(
                        AdditionalQuestonsApplication.id,
                        ApplicationStatus.UNIQUE_FORM
                    );
                }
            }

            const uniqueApplication: Application =
                await this.client.db.getApplicationByStatus(
                    ApplicationStatus.UNIQUE_FORM
                );
            if (
                this.runtime.character.name === "yconicUniqueness" &&
                uniqueApplication.status === ApplicationStatus.UNIQUE_FORM
            ) {
                const submission: Submission = JSON.parse(
                    uniqueApplication.message
                );
                const success = await this.callYconicAgent(
                    "yconicUniqueness",
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
            if (
                this.runtime.character.name === "yconicScore" &&
                scoredApplication.status === ApplicationStatus.SCORED
            ) {
                // const submission: Submission = JSON.parse(
                //     scoredApplication.message
                // );
                // const success = await this.callYconicAgent(
                //     "yconicScore",
                //     "550e8400-e29b-41d4-a716-446655440004",
                //     "ANALYZE_ADDITIONAL_QUESTIONS",
                //     submission
                // );

                // await this.client.db.updateApplicationStatus(
                //     scoredApplication.id,
                //     ApplicationStatus.SCORED
                // );

                elizaLogger.info("#######################################");
                elizaLogger.info("CONGRATULATIONS!!!!!!!!!!!!");
                elizaLogger.info("#######################################");
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
