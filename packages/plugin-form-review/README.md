# Form Review Plugin

A plugin for reviewing and analyzing VC Accelerator application forms. This plugin provides comprehensive form analysis capabilities including form completion checking, uniqueness assessment, question analysis, and score generation.

## Features

- Form completion validation
- Uniqueness and innovation assessment
- Question response analysis
- Comprehensive score generation

## Installation

```bash
pnpm add @elizaos/plugin-form-review
```

## Usage

```typescript
import { formReviewPlugin } from '@elizaos/plugin-form-review';

const character = {
    // ... other character config
    plugins: [formReviewPlugin],
};
```

## Actions

### 1. Form Completion (`VALIDATE_APPLICATION_FORM`)
Validates application forms for completeness and required fields.

### 2. Questions Analysis (`ANALYZE_ADDITIONAL_QUESTIONS`)
Analyzes responses to additional questions in applications.

### 3. Uniqueness Assessment (`ASSESS_UNIQUENESS`)
Evaluates the uniqueness and innovation level of applications.

### 4. Score Generator (`SCORE_GENERATOR`)
Generates comprehensive review scores by aggregating various assessment factors.

## Example

```typescript
// Example of analyzing form completion
const response = await runtime.processAction("VALIDATE_APPLICATION_FORM", {
    content: {
        type: "application",
        data: {
            companyName: "TechCorp",
            description: "A comprehensive description...",
            founderDetails: [
                {
                    name: "John Doe",
                    email: "john@techcorp.com",
                    role: "CEO"
                }
            ]
        }
    }
});
```

## Development

```bash
# Install dependencies
pnpm install

# Build the plugin
pnpm build

# Run tests
pnpm test

# Lint code
pnpm lint
```

## License

MIT 