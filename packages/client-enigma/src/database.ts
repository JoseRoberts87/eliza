import { elizaLogger } from "@elizaos/core";
import Database from "better-sqlite3";
import path from "path";

export interface Application {
    id: string;
    companyName: string;
    description: string;
    submittedAt: number;
    status: string;
    data: string; // JSON stringified data
}

export interface Review {
    id: string;
    applicationId: string;
    score: number;
    feedback: string;
    createdAt: number;
    reviewerId: string;
}

export class DatabaseService {
    private db: Database.Database | null = null;
    private readonly dbPath: string;
    private readonly dataDir: string;

    constructor() {
        this.dataDir = path.join(process.cwd(), "./agent/data");
        this.dbPath = path.join(this.dataDir, "enigma.db");
    }

    async init(): Promise<void> {
        try {
            // Create data directory if it doesn't exist
            // Connect to database
            // this.db = new Database(this.dbPath);
            elizaLogger.info("Connected to database:", this.dbPath);

            // // Create tables if they don't exist
            // if (!dbExists) {
            // await this.createTables();
            // elizaLogger.info("Created database tables");
            // // }
        } catch (error) {
            elizaLogger.error("Error initializing database:", error);
            throw error;
        }
    }

    // private async createTables(): Promise<void> {
    //     if (!this.db) {
    //         throw new Error("Database not initialized");
    //     }

    //     // Create applications table
    //     this.db.exec(`
    //         CREATE TABLE IF NOT EXISTS applications (
    //             id TEXT PRIMARY KEY,
    //             companyName TEXT NOT NULL,
    //             submittedAt INTEGER NOT NULL,
    //             status TEXT NOT NULL
    //         )
    //     `);

    //     // Create reviews table
    //     this.db.exec(`
    //         CREATE TABLE IF NOT EXISTS reviews (
    //             id TEXT PRIMARY KEY,
    //             applicationId TEXT NOT NULL,
    //             score INTEGER NOT NULL,
    //             feedback TEXT NOT NULL,
    //             createdAt INTEGER NOT NULL,
    //             reviewerId TEXT NOT NULL,
    //             FOREIGN KEY (applicationId) REFERENCES applications(id)
    //         )
    //     `);
    // }

    // async insertApplication(application: Application): Promise<void> {
    //     if (!this.db) {
    //         throw new Error("Database not initialized");
    //     }

    //     const stmt = this.db.prepare(`
    //         INSERT INTO applications (id, companyName, submittedAt, status)
    //         VALUES (?, ?, ?, ?)
    //     `);

    //     stmt.run(
    //         application.id,
    //         application.companyName,
    //         application.submittedAt,
    //         application.status
    //     );
    // }

    // async insertReview(review: Review): Promise<void> {
    //     if (!this.db) {
    //         throw new Error("Database not initialized");
    //     }

    //     const stmt = this.db.prepare(`
    //         INSERT INTO reviews (id, applicationId, score, feedback, createdAt, reviewerId)
    //         VALUES (?, ?, ?, ?, ?, ?)
    //     `);

    //     stmt.run(
    //         review.id,
    //         review.applicationId,
    //         review.score,
    //         review.feedback,
    //         review.createdAt,
    //         review.reviewerId
    //     );
    // }

    // async getApplication(id: string): Promise<Application | null> {
    //     if (!this.db) {
    //         throw new Error("Database not initialized");
    //     }

    //     const stmt = this.db.prepare("SELECT * FROM applications WHERE id = ?");
    //     return stmt.get(id) as Application | null;
    // }

    // async getReviewsByApplication(applicationId: string): Promise<Review[]> {
    //     if (!this.db) {
    //         throw new Error("Database not initialized");
    //     }

    //     const stmt = this.db.prepare(
    //         "SELECT * FROM reviews WHERE applicationId = ?"
    //     );
    //     return stmt.all(applicationId) as Review[];
    // }

    // async close(): Promise<void> {
    //     if (this.db) {
    //         this.db.close();
    //         this.db = null;
    //         elizaLogger.info("Closed database connection");
    //     }
    // }

    isConnected(): boolean {
        return this.db !== null;
    }
}
