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
                this.client.config.ENIGMA_POLL_INTERVAL * 500
            );
        };
        handleInteractionsLoop();
    }

    async handleInteractions() {
        elizaLogger.info("Checking Enigma interactions...");
        elizaLogger.info(this.runtime.character.name);
        try {
            if (this.isDryRun) {
                elizaLogger.info("Dry run: Would process interactions here");
            } else {
                elizaLogger.info("Processing interactions...");
                const application: Application =
                    await this.client.db.getApplicationByStatus(
                        ApplicationStatus.RECEIVED
                    );
                if (
                    this.runtime.character.name === "yconicReceiver" &&
                    application.status === ApplicationStatus.RECEIVED
                ) {
                    const submission: Submission = JSON.parse(
                        application.message
                    );
                    const success = await this.callYconicCompletion(submission);
                    if (success) {
                        await this.client.db.updateApplicationStatus(
                            application.id,
                            ApplicationStatus.FORM_COMPLETED
                        );
                    }
                }
                else if (
                    this.runtime.character.name === "yconicCompletion" &&
                    application.status === ApplicationStatus.RECEIVED
                ) {
                    const submission: Submission = JSON.parse(
                        application.message
                    );
                    // await this.callYconicCompletion(submission);
                }
            }
        } catch (error) {
            elizaLogger.error("Error handling Enigma interactions:", error);
        }
    }

    async callYconicCompletion(submisison: Submission): Promise<boolean> {
        elizaLogger.info("Calling Yconic completion...");

        const fileContent = new Blob([
            fs.readFileSync(submisison.attachments[0].url),
        ]);
        // formdata.append("file", fileContent, submisison.attachments[0].title);

        const requestOptions: RequestInit = {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                text: "VALIDATE_APPLICATION_FORM",
                user: "yconicReceiver",
                file: fileContent,
            }),
            redirect: "follow",
        };

        elizaLogger.info(requestOptions);
        let success: boolean = false;

        try {
            await fetch(
                "http://localhost:3000/550e8400-e29b-41d4-a716-446655440001/message",
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
