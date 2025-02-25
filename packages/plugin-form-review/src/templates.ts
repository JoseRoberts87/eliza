export const formCompletionTemplate = `Analyze the following application form for completeness and validity:

Application Details:
{{applicationData}}

Check for:
1. Required fields completion
2. Data format validity
3. Content quality and depth
4. Overall form completion status

Provide a detailed assessment with:
- Completion status
- List of missing fields
- Validation errors
- Overall completion score`;

export const uniquenessTemplate = `Analyze the application for uniqueness and innovation:

Company: {{companyName}}
Description: {{description}}
Additional Info: {{additionalInfo}}

Consider:
1. Innovation level in the proposed solution
2. Market differentiation
3. Unique value proposition
4. Technical novelty
5. Business model innovation

Compare with existing applications to:
- Identify similar applications
- Highlight unique aspects
- Assess market positioning
- Evaluate technical differentiation`;

export const questionsTemplate = `Analyze the following answer to an additional question in the application.
Focus on:
1. Quality - depth, clarity and thoughtfulness of response
2. Relevance - how well it addresses the specific question
3. Areas for improvement

Question: {{question}}
Answer: {{answer}}

Provide a detailed analysis with specific scores and actionable feedback.`;

export const scoreGeneratorTemplate = `Generate a comprehensive score based on the following assessment factors:

Uniqueness Score: {{uniquenessScore}}
Completion Score: {{completionScore}}
Quality Score: {{qualityScore}}
Innovation Score: {{innovationScore}}

Consider the following weights:
- Uniqueness: {{weights.uniqueness}}
- Completion: {{weights.completion}}
- Quality: {{weights.quality}}
- Innovation: {{weights.innovation}}

Calculate:
1. Individual normalized scores (0-100)
2. Weighted total score
3. Score breakdown with explanations`; 