import fs from "fs/promises";
import path from "path";
import Handlebars from "handlebars";

export interface EmailTemplate {
    id: string;
    name: string;
    subject: string;
    body: string;
    variables: string[];
}

export class TemplateManager {
    private templatesDir: string;
    private templates: Map<string, EmailTemplate>;

    constructor(templatesDir: string) {
        this.templatesDir = templatesDir;
        this.templates = new Map();
    }

    async loadTemplates(): Promise<void> {
        try {
            const files = await fs.readdir(this.templatesDir);

            for (const file of files) {
                if (file.endsWith(".hbs")) {
                    const templatePath = path.join(this.templatesDir, file);
                    const content = await fs.readFile(templatePath, "utf-8");

                    // Extract template metadata from the first comment block
                    const metadataMatch = content.match(
                        /{{!\s*(\{[\s\S]*?\})\s*}}/
                    );
                    if (metadataMatch) {
                        try {
                            const metadata = JSON.parse(metadataMatch[1]);
                            const template: EmailTemplate = {
                                id: path.basename(file, ".hbs"),
                                name:
                                    metadata.name ||
                                    path.basename(file, ".hbs"),
                                subject: metadata.subject || "",
                                body: content,
                                variables: this.extractVariables(content),
                            };

                            this.templates.set(template.id, template);
                        } catch (error) {
                            console.error(
                                `Failed to parse metadata for template ${file}:`,
                                error
                            );
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Failed to load templates:", error);
            throw error;
        }
    }

    private extractVariables(template: string): string[] {
        const variables = new Set<string>();
        const regex = /{{([^{}>]+)}}/g;
        let match;

        while ((match = regex.exec(template)) !== null) {
            const variable = match[1].trim();
            if (!variable.startsWith("#") && !variable.startsWith("/")) {
                variables.add(variable);
            }
        }

        return Array.from(variables);
    }

    getTemplate(id: string): EmailTemplate | undefined {
        return this.templates.get(id);
    }

    async renderTemplate(
        id: string,
        context: Record<string, any>
    ): Promise<string> {
        const template = this.getTemplate(id);
        if (!template) {
            throw new Error(`Template ${id} not found`);
        }

        const compiledTemplate = Handlebars.compile(template.body);
        return compiledTemplate(context);
    }

    getAllTemplates(): EmailTemplate[] {
        return Array.from(this.templates.values());
    }
}
