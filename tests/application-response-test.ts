import { config } from "dotenv";
config(); // Load environment variables from .env file

import {
    UUID,
    Memory,
    Account,
    Actor,
    Goal,
    GoalStatus,
    Relationship,
    RAGKnowledgeItem,
    Participant,
    IAgentRuntime,
    ModelProviderName,
    State,
    IMemoryManager,
} from "../packages/core/dist/types";

import {
    EmailClient,
    ApplicationResult,
} from "../packages/client-email/src/index.js";
import path from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";
import fetch from "node-fetch";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class InMemoryDatabaseAdapter {
    private memories: Map<string, Memory[]> = new Map();
    public db: any = {}; // Required by IDatabaseAdapter interface

    async init(): Promise<void> {}
    async close(): Promise<void> {}

    async getAccountById(userId: UUID): Promise<Account | null> {
        return null;
    }

    async createAccount(account: Account): Promise<boolean> {
        return true;
    }

    async getMemories(params: {
        agentId: UUID;
        roomId: UUID;
        count?: number;
        unique?: boolean;
        tableName: string;
    }): Promise<Memory[]> {
        return this.memories.get(params.tableName) || [];
    }

    async getMemoriesByRoomIds(params: {
        agentId: UUID;
        roomIds: UUID[];
        tableName: string;
        limit?: number;
    }): Promise<Memory[]> {
        return [];
    }

    async getMemoryById(id: UUID): Promise<Memory | null> {
        return null;
    }

    async getMemoriesByIds(
        memoryIds: UUID[],
        tableName?: string
    ): Promise<Memory[]> {
        return [];
    }

    async getCachedEmbeddings(
        params: any
    ): Promise<{ embedding: number[]; levenshtein_score: number }[]> {
        return [];
    }

    async log(params: {
        body: { [key: string]: unknown };
        userId: UUID;
        roomId: UUID;
        type: string;
    }): Promise<void> {}

    async getActorDetails(params: { roomId: UUID }): Promise<Actor[]> {
        return [];
    }

    async searchMemories(params: any): Promise<Memory[]> {
        return [];
    }

    async updateGoalStatus(params: {
        goalId: UUID;
        status: GoalStatus;
    }): Promise<void> {}

    async searchMemoriesByEmbedding(
        embedding: number[],
        params: any
    ): Promise<Memory[]> {
        return [];
    }

    async createMemory(
        memory: Memory,
        tableName: string,
        unique?: boolean
    ): Promise<void> {
        if (!this.memories.has(tableName)) {
            this.memories.set(tableName, []);
        }
        this.memories.get(tableName)?.push(memory);
    }

    async removeMemory(memoryId: UUID, tableName: string): Promise<void> {}
    async removeAllMemories(roomId: UUID, tableName: string): Promise<void> {}
    async countMemories(
        roomId: UUID,
        unique?: boolean,
        tableName?: string
    ): Promise<number> {
        return 0;
    }

    async getGoals(params: any): Promise<Goal[]> {
        return [];
    }

    async updateGoal(goal: Goal): Promise<void> {}
    async createGoal(goal: Goal): Promise<void> {}
    async removeGoal(goalId: UUID): Promise<void> {}
    async removeAllGoals(roomId: UUID): Promise<void> {}

    async getRoom(roomId: UUID): Promise<UUID | null> {
        return null;
    }

    async createRoom(roomId?: UUID): Promise<UUID> {
        return roomId || ("new-room" as UUID);
    }

    async removeRoom(roomId: UUID): Promise<void> {}

    async getRoomsForParticipant(userId: UUID): Promise<UUID[]> {
        return [];
    }

    async getRoomsForParticipants(userIds: UUID[]): Promise<UUID[]> {
        return [];
    }

    async addParticipant(userId: UUID, roomId: UUID): Promise<boolean> {
        return true;
    }

    async removeParticipant(userId: UUID, roomId: UUID): Promise<boolean> {
        return true;
    }

    async getParticipantsForAccount(userId: UUID): Promise<Participant[]> {
        return [];
    }

    async getParticipantsForRoom(roomId: UUID): Promise<UUID[]> {
        return [];
    }

    async getParticipantUserState(
        roomId: UUID,
        userId: UUID
    ): Promise<"FOLLOWED" | "MUTED" | null> {
        return null;
    }

    async setParticipantUserState(
        roomId: UUID,
        userId: UUID,
        state: "FOLLOWED" | "MUTED" | null
    ): Promise<void> {}

    async createRelationship(params: {
        userA: UUID;
        userB: UUID;
    }): Promise<boolean> {
        return true;
    }

    async getRelationship(params: {
        userA: UUID;
        userB: UUID;
    }): Promise<Relationship | null> {
        return null;
    }

    async getRelationships(params: { userId: UUID }): Promise<Relationship[]> {
        return [];
    }

    async getKnowledge(params: any): Promise<RAGKnowledgeItem[]> {
        return [];
    }

    async searchKnowledge(params: any): Promise<RAGKnowledgeItem[]> {
        return [];
    }

    async createKnowledge(knowledge: RAGKnowledgeItem): Promise<void> {}
    async removeKnowledge(id: UUID): Promise<void> {}
    async clearKnowledge(agentId: UUID, shared?: boolean): Promise<void> {}
}

// Create a minimal mock runtime for email testing
const mockRuntime = {
    agentId: "test-agent" as UUID,
    character: JSON.parse(
        readFileSync(
            path.join(process.cwd(), "characters", "yolanda.character.json"),
            "utf-8"
        )
    ),
    messageManager: undefined as unknown as IMemoryManager, // Will be set after creating MockMemoryManager
    modelProvider: ModelProviderName.OPENAI,
};

class MockMemoryManager implements IMemoryManager {
    runtime = mockRuntime as unknown as IAgentRuntime;
    tableName = "messages";

    async createMemory(memory: Memory, unique?: boolean): Promise<void> {
        // Just simulate storing the memory without returning it
    }

    async searchMemories() {
        return [];
    }

    async removeMemory() {}

    async addEmbeddingToMemory(memory: Memory) {
        return memory;
    }

    async getMemories() {
        return [];
    }

    async getCachedEmbeddings() {
        return [];
    }

    async countMemories() {
        return 0;
    }

    async removeAllMemories() {}

    async searchMemoriesByEmbedding() {
        return [];
    }

    async getMemoriesByIds() {
        return [];
    }

    async getMemoriesByRoomIds() {
        return [];
    }

    async getMemoryById() {
        return null;
    }
}

// Set the message manager after creating the class
mockRuntime.messageManager = new MockMemoryManager();

async function runTest() {
    // Test application data
    const application = {
        applicant_name: "John Smith",
        company_name: "Tech Innovators",
        position: "Startup Founder",
        email: "programmedserver@gmail.com",
        pitch: "AI-powered sustainable energy solution",
        market_size: "$5B",
        team_size: 4,
        funding_needed: "$500K",
    };

    try {
        // Initialize email client with proper SSL configuration
        const emailClient = new EmailClient(
            {
                smtp: {
                    host: process.env.SMTP_HOST || "smtp.gmail.com",
                    port: 465, // Gmail's SSL port
                    secure: true, // Use SSL
                    auth: {
                        user: process.env.SMTP_USER || "",
                        pass: process.env.SMTP_PASS || "",
                    },
                },
                from: process.env.SMTP_FROM || "",
                templatesDir: path.join(
                    process.cwd(),
                    "packages",
                    "client-email",
                    "templates"
                ),
            },
            mockRuntime as any
        );

        // Simulate application review result
        const reviewResult = {
            status: "accepted" as const,
            score: 85,
            reviewDate: new Date(),
            reviewerId: mockRuntime.agentId,
            applicantEmail: application.email,
            name: application.applicant_name,
            id: "APP-" + Date.now(),
            reviewScore: 85,
            reviewNotes: ["Strong market potential", "Experienced team"],
            strengths: ["Strong market potential", "Experienced team"],
            nextSteps: [
                "Schedule initial meeting",
                "Complete due diligence paperwork",
                "Prepare pitch deck review",
            ],
        };

        // Generate and send response email
        console.log("\nGenerating response email...");
        const emailContent =
            await emailClient.generateResponseEmail(reviewResult);
        console.log("Email content generated:", emailContent);

        // Queue and send the email
        console.log("\nSending email...");
        try {
            const memory = await emailClient.sendEmail(emailContent);
            console.log("Email sent! Memory ID:", memory.id);

            // Check email status
            if (memory.id) {
                const status = await emailClient.getEmailStatus(memory.id);
                console.log("\nEmail status:", status);
            }
        } catch (error) {
            console.log("Failed to send email:", error);
            console.log(
                "This is expected without proper SMTP credentials. The email content was generated successfully."
            );
        }
    } catch (error) {
        console.error("Error during test:", error);
    }
}

// Run the test
runTest().catch(console.error);
