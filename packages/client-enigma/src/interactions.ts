import { type IAgentRuntime, elizaLogger } from "@elizaos/core";
import { ClientBase } from "./base";
import { DatabaseService } from "./database";
import { ApplicationStatus, Application } from "./type";

export class EnigmaInteractionClient {
    client: ClientBase;
    runtime: IAgentRuntime;
    private isDryRun: boolean;
    db: DatabaseService;

    constructor(client: ClientBase, runtime: IAgentRuntime) {
        this.client = client;
        this.runtime = runtime;
        this.isDryRun = this.client.config.ENIGMA_DRY_RUN || false;
    }

    async start() {
        const handleInteractionsLoop = () => {
            this.handleInteractions();
            setTimeout(
                handleInteractionsLoop,
                // Use the configured poll interval
                this.client.config.ENIGMA_POLL_INTERVAL * 1000
            );
        };
        handleInteractionsLoop();
    }

    private async handleInteractions() {
        elizaLogger.info("Checking Enigma interactions...");
        try {
            // Add your interaction handling logic here
            if (this.isDryRun) {
                elizaLogger.info("Dry run: Would process interactions here");
            } else {
                elizaLogger.info("Processing interactions...");

                const application: Application[] = await this.client.db.getApplicationByStatus(ApplicationStatus.RECEIVED, true);
                // Add actual interaction processing logic here
                elizaLogger.info(`Processing application: ${application}`);
            }
        } catch (error) {
            elizaLogger.error("Error handling Enigma interactions:", error);
        }
    }
} 