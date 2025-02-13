import { type IAgentRuntime, elizaLogger } from "@elizaos/core";
import { DatabaseService } from "./database";

export interface EnigmaConfig {
    ENIGMA_DRY_RUN?: boolean;
    ENIGMA_POLL_INTERVAL?: number;
}

export class ClientBase {
    runtime: IAgentRuntime;
    config: EnigmaConfig;
    profile: { id: string; username: string };
    db: DatabaseService;

    constructor(runtime: IAgentRuntime, config: EnigmaConfig) {
        this.runtime = runtime;
        this.config = {
            ENIGMA_DRY_RUN: config.ENIGMA_DRY_RUN || false,
            ENIGMA_POLL_INTERVAL: config.ENIGMA_POLL_INTERVAL || 120, // Default 2 minutes
        };
        this.profile = {
            id: runtime.agentId,
            username: runtime.character.username
        };
        this.db = new DatabaseService();
    }

    async init() {
        elizaLogger.info("Initializing Enigma client...");
        
        try {
            // Initialize database
            await this.db.init();
            elizaLogger.info("Database initialized successfully");

            if (!this.db.isConnected()) {
                throw new Error("Database failed to connect");
            }
        } catch (error) {
            elizaLogger.error("Failed to initialize database:", error);
            throw error;
        }
    }

    async cleanup() {
        try {
            await this.db.close();
        } catch (error) {
            elizaLogger.error("Error during cleanup:", error);
        }
    }
} 