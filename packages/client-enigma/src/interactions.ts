import { type IAgentRuntime, elizaLogger } from "@elizaos/core";
import { ClientBase } from "./base";

export class EnigmaInteractionClient {
    client: ClientBase;
    runtime: IAgentRuntime;
    private isDryRun: boolean;

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
                // Add actual interaction processing logic here
            }
        } catch (error) {
            elizaLogger.error("Error handling Enigma interactions:", error);
        }
    }
} 