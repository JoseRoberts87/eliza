import { z } from "zod";

// Form Completion Types
export const FormCompletionSchema = z.object({
    isComplete: z.boolean(),
    missingFields: z.array(z.string()),
    validationErrors: z.array(z.string()),
    score: z.number().min(0).max(100)
});

export type FormCompletionResult = z.infer<typeof FormCompletionSchema>;

export const isFormCompletionResult = (obj: unknown): obj is FormCompletionResult => {
    return FormCompletionSchema.safeParse(obj).success;
};

// Uniqueness Assessment Types
export const UniquenessAssessmentSchema = z.object({
    innovationScore: z.number().min(0).max(100),
    uniquenessScore: z.number().min(0).max(100),
    innovativeAspects: z.array(z.string()),
    marketDifferentiators: z.array(z.string()),
    similarApplications: z.array(z.object({
        id: z.string(),
        similarity: z.number().min(0).max(100),
        matchingAspects: z.array(z.string())
    })),
    recommendations: z.array(z.string())
});

export type UniquenessAssessmentResult = z.infer<typeof UniquenessAssessmentSchema>;

export const isUniquenessAssessmentResult = (obj: unknown): obj is UniquenessAssessmentResult => {
    return UniquenessAssessmentSchema.safeParse(obj).success;
};

// Questions Analysis Types
export const QuestionAnalysisSchema = z.object({
    quality: z.number().min(0).max(100),
    relevance: z.number().min(0).max(100),
    feedback: z.string()
});

export type QuestionAnalysisResult = z.infer<typeof QuestionAnalysisSchema>;

export const isQuestionAnalysisResult = (obj: unknown): obj is QuestionAnalysisResult => {
    return QuestionAnalysisSchema.safeParse(obj).success;
};

// Score Generator Types
export interface ScoringWeights {
    uniqueness: number;
    completion: number;
    quality: number;
    innovation: number;
}

export interface ScoreBreakdown {
    uniquenessScore: number;
    completionScore: number;
    qualityScore: number;
    innovationScore: number;
    totalScore: number;
} 