import { z } from "zod";

export const FormCompletionSchema = z.object({
    companyName: z.string().min(1, "Company name is required"),
    description: z
        .string()
        .min(50, "Description must be at least 50 characters"),
    founderDetails: z
        .array(
            z.object({
                name: z.string().min(1, "Founder name is required"),
                email: z.string().email("Valid email is required"),
                role: z.string().min(1, "Founder role is required"),
            })
        )
        .min(1, "At least one founder is required"),
    pitchDeck: z.string().url("Valid pitch deck URL is required").optional(),
    additionalInfo: z.record(z.string(), z.any()).optional(),
});

export const QuestionAnalysisSchema = z.object({
    questionId: z.string(),
    question: z.string(),
    answer: z.string(),
    analysis: z.object({
        relevance: z.number().min(0).max(100),
        completeness: z.number().min(0).max(100),
        clarity: z.number().min(0).max(100),
        quality: z.number().min(0).max(100),
    }),
    feedback: z.array(z.string()),
    followUpQuestions: z.array(z.string()).optional(),
});

export type QuestionAnalysisResult = {
    overallScore: number;
    analyses: z.infer<typeof QuestionAnalysisSchema>[];
    summary: string;
    recommendations: string[];
};

export type FormCompletionResult = {
    isComplete: boolean;
    missingFields: string[];
    validationErrors: string[];
    score: number;
    questionAnalysis?: QuestionAnalysisResult;
};

export const isFormCompletionResult = (
    obj: any
): obj is FormCompletionResult => {
    return (
        typeof obj === "object" &&
        typeof obj.isComplete === "boolean" &&
        Array.isArray(obj.missingFields) &&
        Array.isArray(obj.validationErrors) &&
        typeof obj.score === "number" &&
        (!obj.questionAnalysis ||
            (typeof obj.questionAnalysis === "object" &&
                typeof obj.questionAnalysis.overallScore === "number" &&
                Array.isArray(obj.questionAnalysis.analyses) &&
                typeof obj.questionAnalysis.summary === "string" &&
                Array.isArray(obj.questionAnalysis.recommendations)))
    );
};
