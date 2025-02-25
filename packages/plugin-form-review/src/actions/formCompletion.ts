import {
    Action,
    IAgentRuntime,
    Memory,
    HandlerCallback,
    State,
    composeContext,
    generateObject,
    ModelClass,
    elizaLogger,
} from "@elizaos/core";

import {
    FormCompletionSchema,
    FormCompletionResult,
    isFormCompletionResult,
} from "./types";
import { formCompletionTemplate } from "./templates";
import { z } from "zod";

elizaLogger.info("VALIDATE_APPLICATION_FORM loaded");

export const formCompletionAction: Action = {
    name: "VALIDATE_APPLICATION_FORM",
    similes: ["CHECK_APPLICATION_FORM", "VERIFY_APPLICATION_FORM"],
    description:
        "Validates VC Accelerator applications by checking form completion and required fields",

    validate: async (runtime: IAgentRuntime, message: Memory) => {
        // Validate that we have an application to check
        // return (
        //     message.content?.type === "application" && !!message.content.data
        // );
        return true;
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State,
        _options?: any,
        callback?: HandlerCallback
    ) => {
        elizaLogger.info("VALIDATE_APPLICATION_FORM called");

        try {
            if (!state) {
                if (callback) {
                    callback(
                        {
                            text: "Failed to validate application: Missing state.",
                            type: "error",
                        },
                        []
                    );
                }
                return;
            }

            // Validate form completion
            const formContext = composeContext({
                state,
                template: formCompletionTemplate,
            });

            const formValidation = await generateObject({
                runtime,
                context: formContext,
                modelClass: ModelClass.SMALL,
                schema: FormCompletionSchema,
            });

            const formResult = formValidation.object as z.infer<
                typeof FormCompletionSchema
            >;

            // Calculate score based on completeness and quality
            let score = 0;
            const missingFields: string[] = [];
            const validationErrors: string[] = [];

            // Company Information (30 points)
            if (formResult.companyName) score += 10;
            else missingFields.push("Company Name");
            
            if (formResult.oneLineDescription) {
                if (formResult.oneLineDescription.length <= 140) score += 10;
                else validationErrors.push("One-line description exceeds 140 characters");
            } else missingFields.push("One-line Description");
            
            if (formResult.problemStatement) {
                if (formResult.problemStatement.length <= 500) score += 10;
                else validationErrors.push("Problem statement exceeds 500 characters");
            } else missingFields.push("Problem Statement");

            // Optional: Website URL validation
            if (formResult.websiteUrl && !formResult.websiteUrl.match(/^https?:\/\/.+/)) {
                validationErrors.push("Invalid website URL format");
            }

            // Product & Market (40 points)
            if (formResult.productStage) score += 10;
            else missingFields.push("Product Stage");
            if (typeof formResult.payingCustomers === 'number') score += 10;
            else missingFields.push("Number of Paying Customers");
            if (formResult.technicalTeam?.length > 0) score += 10;
            else missingFields.push("Technical Team Composition");
            if (formResult.technicalNeeds?.length > 0) {
                if (formResult.technicalNeeds.length <= 3) score += 10;
                else validationErrors.push("Too many technical needs selected (max 3)");
            } else missingFields.push("Technical Needs");

            // Competition & Strategy (30 points)
            if (formResult.competitors?.competitor1) score += 10;
            else missingFields.push("Primary Competitor");
            if (formResult.keyDifferentiator) score += 10;
            else missingFields.push("Key Differentiator");
            if (formResult.technicalMilestones?.milestone1 && 
                formResult.technicalMilestones?.milestone2 && 
                formResult.technicalMilestones?.milestone3) score += 10;
            else missingFields.push("Technical Milestones");

            const result: FormCompletionResult = {
                isComplete: score === 100,
                missingFields,
                validationErrors,
                score,
            };

            if (!isFormCompletionResult(result)) {
                if (callback) {
                    callback(
                        {
                            text: "Failed to validate application. Invalid result format.",
                            type: "error",
                        },
                        []
                    );
                }
                return;
            }

            // Store result in memory
            const memoryManager = runtime.getMemoryManager("form_validation");
            if (memoryManager) {
                await memoryManager.createMemory({
                    content: {
                        type: "form_validation",
                        text: JSON.stringify(result),
                        data: result,
                    },
                    roomId: message.roomId,
                    userId: message.userId,
                    agentId: runtime.agentId,
                    unique: true,
                });
            }

            // Generate response message
            let responseText = `Form Validation Results:
            - Completion Status: ${result.isComplete ? "Complete" : "Incomplete"}
            - Score: ${result.score}/100

            Score Breakdown:
            - Company Information: ${Math.min(30, score)}%
            - Product & Market Information: ${Math.min(40, Math.max(0, score - 30))}%
            - Competition & Strategy: ${Math.min(30, Math.max(0, score - 70))}%
            ${result.missingFields.length > 0 ? `\nMissing Required Fields:\n${result.missingFields.map((f) => `- ${f}`).join("\n")}` : ""}
            ${result.validationErrors.length > 0 ? `\nValidation Errors:\n${result.validationErrors.map((e) => `- ${e}`).join("\n")}` : ""}
            
            ${formResult.websiteUrl ? `\nOptional Fields Provided:\n- Website URL` : ""}
            ${formResult.monthlyRecurringRevenue ? `- Monthly Recurring Revenue` : ""}
            ${formResult.competitors?.competitor2 ? `- Second Competitor` : ""}
            ${formResult.competitors?.competitor3 ? `- Third Competitor` : ""}`;

            if (callback) {
                callback({ text: responseText }, []);
            }
        } catch (error) {
            elizaLogger.error("Error validating application:", error);
            if (callback) {
                callback(
                    {
                        text: "Failed to validate application. Please check the logs.",
                        type: "error",
                    },
                    []
                );
            }
        }
    },

    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Submitting complete application for review",
                    type: "application",
                    data: {
                        companyName: "TechFlow AI",
                        websiteUrl: "https://techflow.ai",
                        oneLineDescription: "AI-powered workflow automation platform that streamlines business processes through natural language understanding",
                        problemStatement: "Enterprise companies struggle with complex, manual workflows that waste time and resources. Current automation solutions require technical expertise and lengthy implementation cycles. TechFlow AI enables non-technical users to automate workflows using natural language commands, reducing automation time from months to minutes.",
                        productStage: "Beta",
                        payingCustomers: 12,
                        monthlyRecurringRevenue: 48000,
                        technicalTeam: ["Backend Developer", "Full Stack Developer", "Data Scientist"],
                        hasTechnicalCofounder: true,
                        technicalNeeds: ["Frontend Development", "DevOps/Infrastructure", "Security Implementation"],
                        competitors: {
                            competitor1: "UiPath",
                            competitor2: "Automation Anywhere",
                            competitor3: "Microsoft Power Automate"
                        },
                        keyDifferentiator: "Our natural language processing engine allows non-technical users to create complex automation workflows without coding, reducing implementation time by 90% compared to traditional RPA solutions.",
                        developerImpact: "Additional developers will help us scale our NLP engine to handle more complex workflows, improve our security infrastructure for enterprise customers, and build a more intuitive frontend interface to increase user adoption.",
                        technicalMilestones: {
                            milestone1: "Deploy enterprise-grade security features including SOC 2 compliance and end-to-end encryption",
                            milestone2: "Launch visual workflow builder with drag-and-drop interface and real-time collaboration",
                            milestone3: "Scale NLP engine to support custom domain-specific language models for different industries"
                        }
                    }
                }
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Form Validation Results:\n- Completion Status: Complete\n- Score: 100/100\n\nScore Breakdown:\n- Company Information: 30%\n- Product & Market Information: 40%\n- Competition & Strategy: 30%\n\nOptional Fields Provided:\n- Website URL\n- Monthly Recurring Revenue\n- Second Competitor\n- Third Competitor",
                    action: "VALIDATE_APPLICATION_FORM"
                }
            }
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Submitting incomplete application",
                    type: "application",
                    data: {
                        companyName: "DevSecOps Pro",
                        oneLineDescription: "A platform that helps development teams implement security best practices",
                        productStage: "Concept",
                        payingCustomers: 0,
                        technicalTeam: ["Other"],
                        hasTechnicalCofounder: false,
                        technicalNeeds: [
                            "Backend Development",
                            "Security Implementation",
                            "DevOps/Infrastructure",
                            "Frontend Development"
                        ],
                        competitors: {
                            competitor1: "Snyk"
                        },
                        technicalMilestones: {
                            milestone1: "Build initial security scanning engine",
                            milestone2: "Implement CI/CD integration"
                        }
                    }
                }
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Form Validation Results:\n- Completion Status: Incomplete\n- Score: 45/100\n\nScore Breakdown:\n- Company Information: 20%\n- Product & Market Information: 15%\n- Competition & Strategy: 10%\n\nMissing Required Fields:\n- Problem Statement\n- Technical Milestone 3\n- Key Differentiator\n- Developer Impact Statement\n\nValidation Errors:\n- Too many technical needs selected (max 3)\n- Other technical team role specified but no description provided",
                    action: "VALIDATE_APPLICATION_FORM"
                }
            }
        ]
    ],
};
