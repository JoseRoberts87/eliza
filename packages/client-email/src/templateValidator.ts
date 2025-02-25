export class TemplateValidator {
    private requiredVariables = {
        accepted: ["applicantName", "highlightedStrength", "nextSteps"],
        rejected: ["applicantName"],
    };

    public validateTemplate(templateName: string, content: string): void {
        const required = this.requiredVariables[templateName];
        if (!required) {
            throw new Error(`Unknown template: ${templateName}`);
        }

        const missingVars = required.filter(
            (variable) =>
                !content.includes(`{{${variable}}}`) &&
                !content.includes(`{{#each ${variable}}}`)
        );

        if (missingVars.length > 0) {
            throw new Error(
                `Template ${templateName} is missing required variables: ${missingVars.join(", ")}`
            );
        }
    }
}
