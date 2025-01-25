import {
    Action,
    IAgentRuntime,
    Memory,
    State,
    Content,
    HandlerCallback,
} from "@elizaos/core";

interface ScoringWeights {
    uniqueness: number;
    completion: number;
    quality: number;
    innovation: number;
}

interface ScoreBreakdown {
    uniquenessScore: number;
    completionScore: number;
    qualityScore: number;
    innovationScore: number;
    totalScore: number;
}

const DEFAULT_WEIGHTS: ScoringWeights = {
    uniqueness: 0.3,
    completion: 0.25,
    quality: 0.25,
    innovation: 0.2,
};

const normalizeScore = (score: number): number => {
    return Math.min(Math.max(score, 0), 100);
};

export const scoreGeneratorAction: Action = {
    name: "SCORE_GENERATOR",
    similes: ["GENERATE_SCORE", "CALCULATE_SCORE", "EVALUATE_APPLICATION"],
    description:
        "Generates a comprehensive review score by aggregating and weighting various assessment factors",

    validate: async (runtime: IAgentRuntime, message: Memory) => {
        // Validate that we have the necessary data in the message content
        const content = message.content as Content;
        return !!(
            content.uniquenessScore &&
            content.completionScore &&
            content.qualityScore
        );
    },

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State,
        options?: any,
        callback?: HandlerCallback
    ) => {
        try {
            const content = message.content as Content & {
                uniquenessScore: number;
                completionScore: number;
                qualityScore: number;
                innovationScore: number;
                weights?: ScoringWeights;
            };

            // Use provided weights or defaults
            const weights = content.weights || DEFAULT_WEIGHTS;

            // Calculate individual normalized scores
            const scores: ScoreBreakdown = {
                uniquenessScore: normalizeScore(content.uniquenessScore),
                completionScore: normalizeScore(content.completionScore),
                qualityScore: normalizeScore(content.qualityScore),
                innovationScore: normalizeScore(content.innovationScore),
                totalScore: 0,
            };

            // Calculate weighted total score
            scores.totalScore = normalizeScore(
                scores.uniquenessScore * weights.uniqueness +
                    scores.completionScore * weights.completion +
                    scores.qualityScore * weights.quality +
                    scores.innovationScore * weights.innovation
            );

            // Store the score breakdown in memory
            await runtime.documentsManager.createMemory({
                id: message.id,
                userId: message.userId,
                roomId: message.roomId,
                agentId: runtime.agentId,
                content: {
                    text: `Application Score Generated:
Uniqueness: ${scores.uniquenessScore.toFixed(2)}
Completion: ${scores.completionScore.toFixed(2)}
Quality: ${scores.qualityScore.toFixed(2)}
Innovation: ${scores.innovationScore.toFixed(2)}
Total Score: ${scores.totalScore.toFixed(2)}`,
                    scores: scores,
                    weights: weights,
                    type: "application_score",
                },
            });

            if (callback) {
                callback(
                    {
                        text: `Score generated successfully. Total score: ${scores.totalScore.toFixed(2)}`,
                        scores: scores,
                        weights: weights,
                        type: "application_score",
                    },
                    []
                );
            }

            return true;
        } catch (error: any) {
            console.error("Error generating score:", error);
            if (callback) {
                callback(
                    {
                        text: "Failed to generate application score. Please check the input data.",
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
                    text: "Generate score for application",
                    uniquenessScore: 85,
                    completionScore: 90,
                    qualityScore: 88,
                    innovationScore: 92,
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Score generated successfully. Total score: 88.45",
                    action: "SCORE_GENERATOR",
                },
            },
        ],
    ],
};
