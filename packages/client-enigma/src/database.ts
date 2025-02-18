import { elizaLogger } from "@elizaos/core";
import pgPromise from "pg-promise";
import { Application, ApplicationStatus, Review } from "./type";

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS applications (
    id TEXT PRIMARY KEY,
    company_name TEXT NOT NULL,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    updated_by TEXT NOT NULL,
    status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    application_id TEXT NOT NULL,
    score INTEGER NOT NULL,
    feedback TEXT NOT NULL,
    createdAt BIGINT NOT NULL,
    reviewer_id TEXT NOT NULL,
    FOREIGN KEY (application_id) REFERENCES applications (id)
);`;


export class DatabaseService {
    db: pgPromise.IDatabase<any> | null = null;
    pgp: pgPromise.IMain | null = null;

    constructor() {
        // Initialize pg-promise with options
        this.pgp = pgPromise({
            // Initialization options
            error: (error: any, e: any) => {
                if (e.cn) {
                    // A connection-related error
                    elizaLogger.error("CN:", e.cn);
                    elizaLogger.error("EVENT:", error.message || error);
                }
            },
        });
    }

    async init(): Promise<void> {
        try {
            const connectionString = "postgres://jrob@localhost:5432/enigma";

            // Create database connection
            this.db = this.pgp!(connectionString);

            elizaLogger.info("Connected to database");

            // Create tables using the schema
            await this.db.none(SCHEMA_SQL);

            elizaLogger.info("Database initialized successfully");
        } catch (error) {
            elizaLogger.error("Error initializing database:", error);
            throw error;
        }
    }

    async close(): Promise<void> {
        if (this.db && this.pgp) {
            // Close all connections
            await this.pgp.end();
            this.db = null;
            this.pgp = null;
            elizaLogger.info("Closed database connection");
        }
    }

    isConnected(): boolean {
        return this.db !== null;
    }

    // Helper method to get database instance
    getDb(): pgPromise.IDatabase<any> {
        // TODO: remove logs that are not needed
        elizaLogger.info("getting DB connection...!!!");
        if (!this.db) {
            // TODO: rethink how this should work to get the db connection
            elizaLogger.error("Database not initialized");
            this.init();
            elizaLogger.info("DB initialized");
        }
        return this.db;
    }

    // Example methods for working with the database
    async insertApplication(application: Application): Promise<void> {
    // TODO: remove logs that are not needed
        elizaLogger.info("Inserting application into database...!!!");
        const db = this.getDb();
        elizaLogger.info("got DB connection!!!!:", application);
        await db.none(
            `INSERT INTO applications(id, company_name, created_at, updated_at, updated_by, status)
             VALUES($1, $2, $3, $4, $5, $6)`,
            [
                application.id,
                application.companyName,
                application.createdAt,
                application.updatedAt,
                application.updatedBy,
                application.status,
            ]
        );
    }

    async getApplicationById(id: string): Promise<Application | null> {
        const db = this.getDb();
        return await db.oneOrNone(
            `SELECT id, company_name as "companyName", updated_at as "updatedAt", status
             FROM applications WHERE id = $1;`,
            id
        );
    }

    async getApplicationByStatus(
        status: ApplicationStatus,
        nextApplication: boolean = false
    ): Promise<Application[]> {
        const db = this.getDb();

        if (nextApplication) {
            return await db.oneOrNone(
                `SELECT id, company_name as "companyName", updated_at as "updatedAt", status
                FROM applications WHERE status = $1 ORDER BY updated_at ASC LIMIT 1;`,
                status
            );
        } else {
            return await db.manyOrNone(
                `SELECT id, company_name as "companyName", updated_at as "updatedAt", status
                 FROM applications WHERE status = $1;`,
                status
            );
        }
    }
    async updateApplicationStatus(
        id: string,
        status: ApplicationStatus
    ): Promise<void> {
        const db = this.getDb();
        await db.none(`UPDATE applications SET status = $1 WHERE id = $2`, [
            status,
            id,
        ]);
    }

    async insertReview(review: Review): Promise<void> {
        const db = this.getDb();
        await db.none(
            `INSERT INTO reviews(id, application_id, score, feedback, created_at, reviewer_id)
             VALUES($1, $2, $3, $4, $5, $6)`,
            [
                review.id,
                review.applicationId,
                review.score,
                review.feedback,
                review.createdAt,
                review.reviewerId,
            ]
        );
    }

    async getReviewsByApplication(applicationId: string): Promise<Review[]> {
        const db = this.getDb();
        return await db.manyOrNone(
            `SELECT id, application_id as "applicationId", score, feedback,
                    createdAt as "createdAt", reviewer_id as "reviewerId"
             FROM reviews WHERE application_id = $1`,
            applicationId
        );
    }
}
