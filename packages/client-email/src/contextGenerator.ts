export interface ApplicationContext {
    applicantName: string;
    applicationId: string;
    reviewScore: number;
    decision: "accepted" | "rejected";
    feedback?: string;
    highlightedStrength?: string;
    nextSteps?: string[];
}

export class ContextGenerator {
    private getNextSteps(score: number): string[] {
        const baseSteps = [
            "Complete onboarding documentation",
            "Schedule initial meeting",
        ];

        if (score > 90) {
            baseSteps.push("Prepare for fast-track program");
        }

        return baseSteps;
    }

    private generateFeedback(score: number, reviewNotes: string[]): string {
        if (score < 50) {
            return "Your application did not meet our current criteria.";
        }
        return reviewNotes.join(" ");
    }

    public async generateContext(
        application: any
    ): Promise<ApplicationContext> {
        const score = application.reviewScore;
        const decision = score >= 70 ? "accepted" : "rejected";

        return {
            applicantName: application.name,
            applicationId: application.id,
            reviewScore: score,
            decision,
            feedback: this.generateFeedback(
                score,
                application.reviewNotes || []
            ),
            highlightedStrength: application.strengths?.[0],
            nextSteps:
                decision === "accepted" ? this.getNextSteps(score) : undefined,
        };
    }
}
