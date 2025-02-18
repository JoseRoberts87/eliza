import { type Client, elizaLogger, type IAgentRuntime } from "@elizaos/core";
import { ClientBase} from "./base";
import { EnigmaInteractionClient } from "./interactions";
import { Application, ApplicationStatus, EnigmaConfig } from "./type";
import { DatabaseService } from "./database";

class EnigmaManager {
    client: ClientBase;
    interaction: EnigmaInteractionClient;

    constructor(runtime: IAgentRuntime, config: EnigmaConfig) {
        this.client = new ClientBase(runtime, config);
        this.interaction = new EnigmaInteractionClient(this.client, runtime);
    }

    async cleanup() {
        await this.client.cleanup();
    }
}

export const EnigmaClientInterface: Client = {
    async start(runtime: IAgentRuntime) {
        const config: EnigmaConfig = {
            ENIGMA_DRY_RUN: process.env.ENIGMA_DRY_RUN === 'true',
            ENIGMA_POLL_INTERVAL: parseInt(process.env.ENIGMA_POLL_INTERVAL || '120'),
        };

        elizaLogger.info("Enigma client starting...");

        const manager = new EnigmaManager(runtime, config);

        try {
            // Initialize base client (including database)
            await manager.client.init();

            // Start interactions handling
            await manager.interaction.start();

            return manager;
        } catch (error) {
            elizaLogger.error("Failed to start Enigma client:", error);
            await manager.cleanup();
            throw error;
        }
    },

    async stop(_runtime: IAgentRuntime) {
        elizaLogger.warn("Enigma client does not support stopping yet");
    },
};

export default EnigmaClientInterface; 

export { ClientBase, type Application, ApplicationStatus, DatabaseService };