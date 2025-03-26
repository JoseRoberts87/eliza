import {
    Action,
    IAgentRuntime,
    Memory,
    State,
    Content,
    HandlerCallback,
    composeContext,
    generateObject,
    elizaLogger,
    ModelClass,
    stringToUuid,
} from "@elizaos/core";
import { scoreEvaluationTemplate } from "./templates";
import { z } from "zod";
import {
    ScoreEvaluation,
    ScoreBreakdown,
    ScoreEvaluationSchema,
} from "./types";
import {
    Application,
    ApplicationStatus,
    DatabaseService,
} from "@elizaos/client-enigma";
import { EmailContent } from "@elizaos/client-email";

const isScoreEvaluation = (obj: any): obj is ScoreEvaluation => {
    return (
        typeof obj === "object" &&
        (obj.decision === "Approved" ||
            obj.decision === "Pending" ||
            obj.decision === "Rejected") &&
        Array.isArray(obj.strengths) &&
        Array.isArray(obj.weaknesses) &&
        Array.isArray(obj.recommendations) &&
        typeof obj.feedback === "string"
    );
};

elizaLogger.info("SCORE_EVALUATOR loaded");

export const applicationDecisionAction: Action = {
    name: "APPLICATION_DECISION",
    similes: ["DECISION_MAKER", "APPLICATION_DECISION_MAKER"],
    description:
        "Evaluates application scores and provides detailed feedback with approval decision",

    validate: async (_runtime: IAgentRuntime, _message: Memory) => {
        elizaLogger.info("APPLICATION_DECISION validator...");
        return true;
    },

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State,
        options?: any,
        callback?: HandlerCallback
    ) => {
        elizaLogger.info("APPLICATION_DECISION called");

        const content = message.content as Content & {
            scores: ScoreBreakdown;
            applicationDetails?: any;
        };        

        try {
            const content = message.content as Content & {
                scores: ScoreBreakdown;
                applicationDetails?: any;
            };

            const currentTime = Date.now();

            const messageId = stringToUuid(currentTime.toString());

            // const scores = content.scores;

            // // Build a template string with the scores injected
            // const templateWithScores = scoreEvaluationTemplate
            //     .replace(
            //         "{{scores.uniquenessScore}}",
            //         scores.uniquenessScore.toString()
            //     )
            //     .replace(
            //         "{{scores.completionScore}}",
            //         scores.completionScore.toString()
            //     )
            //     .replace(
            //         "{{scores.qualityScore}}",
            //         scores.qualityScore.toString()
            //     )
            //     .replace(
            //         "{{scores.innovationScore}}",
            //         scores.innovationScore.toString()
            //     )
            //     .replace("{{scores.totalScore}}", scores.totalScore.toString());

            // // Handle application details
            // let templateWithDetails = templateWithScores;
            // if (content.applicationDetails) {
            //     templateWithDetails = templateWithDetails.replace(
            //         "{{#if applicationDetails}}\n{{applicationDetails}}\n{{else}}\nNo additional application details were provided.\n{{/if}}",
            //         JSON.stringify(content.applicationDetails, null, 2)
            //     );
            // } else {
            //     templateWithDetails = templateWithDetails.replace(
            //         "{{#if applicationDetails}}\n{{applicationDetails}}\n{{else}}\nNo additional application details were provided.\n{{/if}}",
            //         "No additional application details were provided."
            //     );
            // }

            // // Prepare context for evaluation
            // const context = composeContext({
            //     state,
            //     template: templateWithDetails,
            // });

            // // Generate evaluation using LLM
            // const evaluation = await generateObject({
            //     runtime,
            //     context,
            //     modelClass: ModelClass.SMALL,
            //     schema: ScoreEvaluationSchema,
            // });

            // if (!isScoreEvaluation(evaluation.object)) {
            //     if (callback) {
            //         callback(
            //             {
            //                 text: "Failed to generate valid evaluation format.",
            //                 error: "Invalid evaluation format",
            //             },
            //             []
            //         );
            //     }
            //     return false;
            // }

            // const evaluationResult = evaluation.object;

            // Store the evaluation in memory
            //             await runtime.messageManager.createMemory({
            //                 id: message.id,
            //                 userId: message.userId,
            //                 roomId: message.roomId,
            //                 agentId: runtime.agentId,
            //                 content: {
            //                     text: `Application Score Evaluation:
            // Decision: ${evaluationResult.decision}
            // Total Score: ${scores.totalScore.toFixed(2)}

            // Strengths:
            // ${evaluationResult.strengths.map((s) => `- ${s}`).join("\n")}

            // Weaknesses:
            // ${evaluationResult.weaknesses.map((w) => `- ${w}`).join("\n")}

            // Recommendations:
            // ${evaluationResult.recommendations.map((r) => `- ${r}`).join("\n")}

            // Feedback: ${evaluationResult.feedback}`,
            //                     evaluation: evaluationResult,
            //                     scores: scores,
            //                     type: "application_evaluation",
            //                 },
            //             });

            const messageContent = JSON.stringify({
                text: `Application Score Evaluation`,
            });

            elizaLogger.info("#######################################1");

            const emailContent: EmailContent = {
                to: "webterpr@gmail.com",
                subject: "Yconic Application Accepted",
                text: "Congratulations! Your application has been accepted. Please follow the instructions to complete the process.",
                template: "accepted",
            };

            elizaLogger.info("#######################################2");


            try{
                runtime.clients.email.sendEmail(emailContent);
                elizaLogger.info("##### Email sent to webterpr@gmail.com");
            } catch (error) {
                elizaLogger.info(error);
                elizaLogger.error("Error sending email:", error);
            }

            try {
                // TODO: remove logs that are not needed
                const client = new DatabaseService();
                // elizaLogger.info("Inserting application into database...");
                await client.updateApplicationStatus(
                    "edce309a-2bf5-0ad7-a944-5d3d59641214",
                    ApplicationStatus.ACCEPTED
                );
                elizaLogger.info("Application inserted into database");
            } catch (error) {
                elizaLogger.info(error);
                elizaLogger.error(
                    "Error updating application into database:",
                    error
                );
            }

            if (callback) {
                callback(
                    {
                        text: `Application evaluation complete. Decision:`,
                        evaluation: "evaluationResult",
                        scores: "scores",
                        type: "application_evaluation",
                    },
                    []
                );
            }

            return true;
        } catch (error: any) {
            elizaLogger.error("Error evaluating score:", error);
            if (callback) {
                callback(
                    {
                        text: "Failed to evaluate application score. Please check the input data.",
                        error: error.message,
                    },
                    []
                );
            }
            return false;
        }
    },

    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Evaluate application score",
                    scores: {
                        uniquenessScore: 85,
                        completionScore: 90,
                        qualityScore: 88,
                        innovationScore: 92,
                        totalScore: 88.45,
                    },
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Application evaluation complete. Decision: Approved",
                    action: "SCORE_EVALUATOR",
                },
            },
        ],
    ],
};
