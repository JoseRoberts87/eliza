import { describe, it, expect, vi, beforeEach } from "vitest";
import { TemplateManager } from "../templateManager";
import fs from "fs/promises";
import path from "path";

// Mock fs/promises
vi.mock("fs/promises", () => ({
    default: {
        readdir: vi.fn(),
        readFile: vi.fn(),
    },
}));

describe("TemplateManager", () => {
    let templateManager: TemplateManager;
    const templatesDir = "./templates";

    beforeEach(() => {
        vi.clearAllMocks();
        templateManager = new TemplateManager(templatesDir);
    });

    describe("loadTemplates", () => {
        it("should load and parse template files", async () => {
            const mockFiles = [
                "template1.hbs",
                "template2.hbs",
                "not-a-template.txt",
            ];
            const mockTemplate1Content = `{{!
        {
          "name": "Template One",
          "subject": "Template One Subject"
        }
      }}
      Hello {{name}},
      This is template one.`;

            const mockTemplate2Content = `{{!
        {
          "name": "Template Two",
          "subject": "Template Two Subject"
        }
      }}
      Hi {{name}},
      This is template two.
      Your score is {{score}}.`;

            vi.mocked(fs.readdir).mockResolvedValue(mockFiles as any);
            vi.mocked(fs.readFile)
                .mockResolvedValueOnce(mockTemplate1Content)
                .mockResolvedValueOnce(mockTemplate2Content);

            await templateManager.loadTemplates();

            expect(fs.readdir).toHaveBeenCalledWith(templatesDir);
            expect(fs.readFile).toHaveBeenCalledTimes(2);

            const template1 = templateManager.getTemplate("template1");
            const template2 = templateManager.getTemplate("template2");

            expect(template1).toBeDefined();
            expect(template1?.name).toBe("Template One");
            expect(template1?.variables).toContain("name");

            expect(template2).toBeDefined();
            expect(template2?.name).toBe("Template Two");
            expect(template2?.variables).toContain("name");
            expect(template2?.variables).toContain("score");
        });

        it("should handle invalid template metadata gracefully", async () => {
            const mockFiles = ["invalid.hbs"];
            const mockInvalidContent = `{{!
        invalid json
      }}
      Hello {{name}}`;

            vi.mocked(fs.readdir).mockResolvedValue(mockFiles as any);
            vi.mocked(fs.readFile).mockResolvedValue(mockInvalidContent);

            await templateManager.loadTemplates();

            expect(fs.readdir).toHaveBeenCalledWith(templatesDir);
            expect(fs.readFile).toHaveBeenCalledTimes(1);
        });
    });

    describe("renderTemplate", () => {
        it("should render a template with provided context", async () => {
            const templateId = "test-template";
            const mockTemplate = {
                id: templateId,
                name: "Test Template",
                subject: "Test Subject",
                body: "Hello {{name}}, your score is {{score}}.",
                variables: ["name", "score"],
            };

            // Manually set the template
            (templateManager as any).templates.set(templateId, mockTemplate);

            const context = {
                name: "John",
                score: 95,
            };

            const rendered = await templateManager.renderTemplate(
                templateId,
                context
            );
            expect(rendered).toBe("Hello John, your score is 95.");
        });

        it("should throw error for non-existent template", async () => {
            await expect(
                templateManager.renderTemplate("non-existent", {})
            ).rejects.toThrow("Template non-existent not found");
        });
    });

    describe("getAllTemplates", () => {
        it("should return all loaded templates", () => {
            const mockTemplates = [
                {
                    id: "template1",
                    name: "Template One",
                    subject: "Subject One",
                    body: "Content one",
                    variables: ["var1"],
                },
                {
                    id: "template2",
                    name: "Template Two",
                    subject: "Subject Two",
                    body: "Content two",
                    variables: ["var2"],
                },
            ];

            mockTemplates.forEach((template) => {
                (templateManager as any).templates.set(template.id, template);
            });

            const templates = templateManager.getAllTemplates();
            expect(templates).toHaveLength(2);
            expect(templates).toEqual(expect.arrayContaining(mockTemplates));
        });
    });
});
