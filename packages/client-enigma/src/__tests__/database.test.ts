import { DatabaseService, type Application, type Review } from '../database';
import fs from 'fs';
import path from 'path';

jest.mock('@elizaos/core', () => ({
    elizaLogger: {
        info: jest.fn(),
        error: jest.fn(),
    },
}));

describe('DatabaseService', () => {
    let dbService: DatabaseService;
    const testDataDir = path.join(process.cwd(), 'data');
    const testDbPath = path.join(testDataDir, 'enigma.db');

    beforeEach(async () => {
        // Clean up any existing test database
        if (fs.existsSync(testDbPath)) {
            fs.unlinkSync(testDbPath);
        }
        dbService = new DatabaseService();
    });

    afterEach(async () => {
        await dbService.close();
        // Clean up test database
        if (fs.existsSync(testDbPath)) {
            fs.unlinkSync(testDbPath);
        }
    });

    describe('initialization', () => {
        it('should create database and tables if they do not exist', async () => {
            await dbService.init();
            expect(fs.existsSync(testDbPath)).toBeTruthy();
            expect(dbService.isConnected()).toBeTruthy();
        });
    });

    describe('applications', () => {
        beforeEach(async () => {
            await dbService.init();
        });

        it('should insert and retrieve an application', async () => {
            const testApp: Application = {
                id: 'test-app-1',
                companyName: 'Test Company',
                description: 'Test Description',
                submittedAt: Date.now(),
                status: 'pending',
                data: JSON.stringify({ key: 'value' })
            };

            await dbService.insertApplication(testApp);
            const retrieved = await dbService.getApplication(testApp.id);
            expect(retrieved).toBeTruthy();
            expect(retrieved?.companyName).toBe(testApp.companyName);
        });
    });

    describe('reviews', () => {
        let testApp: Application;

        beforeEach(async () => {
            await dbService.init();
            testApp = {
                id: 'test-app-1',
                companyName: 'Test Company',
                description: 'Test Description',
                submittedAt: Date.now(),
                status: 'pending',
                data: JSON.stringify({ key: 'value' })
            };
            await dbService.insertApplication(testApp);
        });

        it('should insert and retrieve reviews for an application', async () => {
            const testReview: Review = {
                id: 'test-review-1',
                applicationId: testApp.id,
                score: 85,
                feedback: 'Good application',
                createdAt: Date.now(),
                reviewerId: 'reviewer-1'
            };

            await dbService.insertReview(testReview);
            const reviews = await dbService.getReviewsByApplication(testApp.id);
            expect(reviews).toHaveLength(1);
            expect(reviews[0].score).toBe(testReview.score);
        });
    });
}); 