# Testing Strategy for ElizaOS Agents

## Overview
This document outlines the testing strategies and procedures for verifying ElizaOS agents' functionality, behavior, and character consistency. The testing approach combines automated unit tests, integration tests, and manual verification steps.

## 1. Unit Testing

### Character Consistency Tests
```typescript
describe('Character Behavior Tests', () => {
    test('agent responds with correct personality traits', async () => {
        const agent = new Agent('stacey.character.json');
        const response = await agent.processMessage('Test message');
        
        expect(response).toMatchCharacterTraits({
            professional: true,
            warm: true,
            detailOriented: true
        });
    });

    test('agent uses configured style consistently', async () => {
        const agent = new Agent('stacey.character.json');
        const responses = await Promise.all([
            agent.processMessage('Message 1'),
            agent.processMessage('Message 2'),
            agent.processMessage('Message 3')
        ]);
        
        expect(responses).toHaveConsistentStyle();
    });
});
```

### Plugin Integration Tests
```typescript
describe('Plugin Integration Tests', () => {
    test('agent correctly loads configured plugins', () => {
        const agent = new Agent('agent.config.json');
        expect(agent.plugins).toContain('form-review');
    });

    test('agent routes requests to appropriate plugin', async () => {
        const agent = new Agent('agent.config.json');
        const mockPlugin = jest.spyOn(agent.plugins['form-review'], 'handle');
        
        await agent.processMessage('Review this form');
        expect(mockPlugin).toHaveBeenCalled();
    });
});
```

## 2. Integration Testing

### End-to-End Workflow Tests
```typescript
describe('End-to-End Agent Workflows', () => {
    test('complete application review workflow', async () => {
        const agent = new Agent('stacey.character.json');
        const db = new TestDatabase();
        
        // Setup test application
        const application = {
            id: 'test-123',
            applicant: 'John Doe',
            status: 'submitted'
        };
        
        await db.applications.insert(application);
        
        // Test complete workflow
        const result = await agent.processApplication(application.id);
        
        expect(result.status).toBe('processed');
        expect(result.response).toMatchCharacterVoice();
        expect(db.applications.get(application.id).status).toBe('reviewed');
    });
});
```

## 3. Manual Testing Steps

### Character Verification
1. **Initial Setup**
   - Load the agent with its character configuration
   - Verify the agent's bio, lore, and knowledge are correctly loaded
   - Check that all configured plugins are available

2. **Interaction Testing**
   - Send test messages that trigger different aspects of the character's personality
   - Verify responses align with the character's defined traits
   - Check for consistency in communication style across multiple interactions

3. **Edge Cases**
   - Test agent behavior with incomplete or malformed inputs
   - Verify graceful handling of missing plugin dependencies
   - Test character consistency under error conditions

### Plugin Integration Verification
1. **Plugin Loading**
   - Verify all configured plugins are loaded successfully
   - Check plugin version compatibility
   - Confirm plugin settings are properly applied

2. **Action Routing**
   - Test that messages are routed to appropriate plugins
   - Verify plugin action priorities are respected
   - Check for proper error handling when plugins are unavailable

3. **Response Processing**
   - Verify plugin responses are properly formatted
   - Check character voice is maintained in plugin-processed responses
   - Test multi-plugin interaction scenarios

## 4. Automated Test Suite

```typescript
// Test Suite Configuration
export const agentTestConfig = {
    characterTests: {
        minResponseLength: 50,
        requiredTraits: ['professional', 'organized', 'thorough'],
        styleConsistencyThreshold: 0.8
    },
    pluginTests: {
        timeout: 5000,
        retryAttempts: 3,
        requiredPlugins: ['form-review', 'application-processor']
    }
};

// Character Consistency Matcher
expect.extend({
    toMatchCharacterVoice(received: string) {
        const traits = analyzeResponse(received);
        const character = loadCharacterConfig();
        
        return {
            pass: traits.every(trait => character.traits.includes(trait)),
            message: () => 'Response does not match character voice'
        };
    }
});
```

## 5. Continuous Integration

### Automated Test Pipeline
1. Run unit tests for character behavior
2. Execute plugin integration tests
3. Perform end-to-end workflow tests
4. Generate test coverage report
5. Verify character consistency metrics

### Manual Verification Checklist
- [ ] Character voice consistency
- [ ] Plugin integration functionality
- [ ] Error handling and recovery
- [ ] Performance under load
- [ ] Multi-character interaction scenarios

## 6. Monitoring and Validation

### Runtime Verification
- Monitor character consistency scores
- Track plugin success rates
- Log unexpected behavior patterns
- Measure response quality metrics

### Performance Metrics
- Response time tracking
- Character trait adherence scores
- Plugin utilization statistics
- Error rate monitoring

## Best Practices

1. **Test Data Management**
   - Maintain separate test character configurations
   - Use realistic but sanitized test data
   - Version control test scenarios

2. **Testing Environment**
   - Isolate test environments from production
   - Mock external dependencies
   - Use consistent test data sets

3. **Continuous Validation**
   - Regular character behavior audits
   - Periodic plugin compatibility checks
   - Automated regression testing

4. **Documentation**
   - Keep test scenarios updated
   - Document character-specific test cases
   - Maintain plugin integration test coverage 