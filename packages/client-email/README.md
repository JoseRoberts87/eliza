# Email Client Documentation

## Template System

### Creating Templates

Templates use Handlebars syntax and should be placed in `src/templates/`.
Each template should have both `.hbs` and `.txt.hbs` versions.

### Available Variables

- `applicantName`: Applicant's full name
- `applicationId`: Unique application identifier
- `reviewScore`: Numerical review score
- `feedback`: Review feedback (if provided)
- `highlightedStrength`: Main strength identified
- `nextSteps`: Array of next steps (for accepted applications)

### Example Usage

typescript
const emailClient = new EmailClient(runtime);
const context = await contextGenerator.generateContext(application);
await emailClient.sendEmail({
template: application.decision === 'accepted' ? 'accepted' : 'rejected',
context,
to: application.email
});

## Tracking System

### Email Status Tracking

The system maintains delivery status for all sent emails with the following information:

- Message ID
- Delivery status (delivered/failed/pending)
- Number of attempts
- Timestamps (sent/delivered)
- Error information (if applicable)

### API Methods

typescript
// Get status of specific email
const status = await emailClient.getEmailStatus(messageId);
// Get all email statuses
const allStatuses = await emailClient.getAllEmailStatuses();

## Memory System

All email communications are stored in the runtime memory system for historical tracking:

- Email content
- Delivery status
- Timestamps
- Related application information

## Error Handling

The system includes:

- Automatic retry mechanism for failed deliveries
- Error logging
- Status tracking for failed attempts
- Configurable retry attempts

## Template Validation

Templates are validated at load time to ensure:

- Required variables are present
- Proper Handlebars syntax
- Both HTML and text versions exist

## Best Practices

1. Always test new templates with the validator
2. Monitor delivery status for important communications
3. Include proper error handling in implementation
4. Regularly check email tracking for failed deliveries
5. Keep templates up to date with current business requirements
