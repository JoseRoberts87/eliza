import { EnigmaInteractionClient } from '../interactions';
import { ClientBase } from '../base';
import { elizaLogger } from '@elizaos/core';

// Mock the dependencies
jest.mock('@elizaos/core', () => ({
    elizaLogger: {
        info: jest.fn(),
        error: jest.fn(),
    },
}));

describe('EnigmaInteractionClient', () => {
    let client: ClientBase;
    let runtime: any;
    let interactionClient: EnigmaInteractionClient;

    beforeEach(() => {
        // Create mock runtime
        runtime = {
            agentId: 'test-agent-id',
            character: {
                username: 'test-agent'
            }
        };

        // Create mock client
        client = new ClientBase(runtime, {
            ENIGMA_DRY_RUN: true,
            ENIGMA_POLL_INTERVAL: 1
        });

        interactionClient = new EnigmaInteractionClient(client, runtime);

        // Clear all mocks before each test
        jest.clearAllMocks();
    });

    describe('handleInteractions', () => {
        it('should log interactions check in dry run mode', async () => {
            // Call private method using any type assertion
            await (interactionClient as any).handleInteractions();

            // Verify logging
            expect(elizaLogger.info).toHaveBeenCalledWith('Checking Enigma interactions...');
            expect(elizaLogger.info).toHaveBeenCalledWith('Dry run: Would process interactions here');
        });
    });
}); 