import { z } from "zod";

export const FormCompletionSchema = z.object({
    companyName: z.string().min(1, "Company name is required"),
    websiteUrl: z.string().url("Valid URL format required").optional(),
    oneLineDescription: z.string().max(140, "Description must be 140 characters or less"),
    problemStatement: z.string().max(500, "Problem statement must be 500 characters or less"),
    productStage: z.enum(["Concept", "MVP", "Beta", "Live"], {
        required_error: "Product stage is required"
    }),
    payingCustomers: z.number().min(0, "Number of customers must be non-negative"),
    monthlyRecurringRevenue: z.number().min(0).optional(),
    technicalTeam: z.array(z.enum([
        "Backend Developer",
        "Frontend Developer",
        "Full Stack Developer",
        "DevOps Engineer",
        "Data Scientist",
        "No technical team yet",
        "Other"
    ])).min(1, "At least one technical team option must be selected"),
    otherTechnicalTeam: z.string().optional(),
    hasTechnicalCofounder: z.boolean(),
    technicalNeeds: z.array(z.enum([
        "Frontend Development",
        "Backend Development",
        "Mobile Development",
        "DevOps/Infrastructure",
        "Data Engineering",
        "Security Implementation",
        "UI/UX Design",
        "Other"
    ])).min(1).max(3, "Maximum 3 technical needs can be selected"),
    otherTechnicalNeeds: z.string().optional(),
    competitors: z.object({
        competitor1: z.string().min(1, "At least one competitor is required"),
        competitor2: z.string().optional(),
        competitor3: z.string().optional()
    }),
    keyDifferentiator: z.string().max(300, "Key differentiator must be 300 characters or less"),
    developerImpact: z.string().max(500, "Developer impact must be 500 characters or less"),
    technicalMilestones: z.object({
        milestone1: z.string().max(200, "Milestone 1 must be 200 characters or less"),
        milestone2: z.string().max(200, "Milestone 2 must be 200 characters or less"),
        milestone3: z.string().max(200, "Milestone 3 must be 200 characters or less")
    })
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

export const UniquenessAssessmentSchema = z.object({
    innovationScore: z.number().min(0).max(100),
    uniquenessScore: z.number().min(0).max(100),
    similarApplications: z.array(
        z.object({
            id: z.string(),
            similarity: z.number().min(0).max(100),
            matchingAspects: z.array(z.string()),
        })
    ),
    innovativeAspects: z.array(z.string()),
    marketDifferentiators: z.array(z.string()),
    recommendations: z.array(z.string()),
});

export type UniquenessAssessmentResult = z.infer<
    typeof UniquenessAssessmentSchema
>;

export const isUniquenessAssessmentResult = (
    obj: any
): obj is UniquenessAssessmentResult => {
    return (
        typeof obj === "object" &&
        typeof obj.innovationScore === "number" &&
        typeof obj.uniquenessScore === "number" &&
        Array.isArray(obj.similarApplications) &&
        Array.isArray(obj.innovativeAspects) &&
        Array.isArray(obj.marketDifferentiators) &&
        Array.isArray(obj.recommendations)
    );
};
