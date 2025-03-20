export const formCompletionTemplate = `
# Form Completion Check

You are validating a VC Accelerator application form. Please check the following aspects:

## Required Fields
1. Company Information:
   - Company Name (Short text field, required)
   - Website/Demo URL (URL field, optional)
   * Validation: Standard URL format, allow empty

2. Solution Description:
   - One-sentence description (Short text field, required)
   * Validation: 140 character limit

3. Problem Statement:
   - What specific problem are you solving? (Text area, required)
   * Validation: 500 character limit

4. Product Stage:
   - Current product stage (Radio buttons, required)
     * Concept
     * MVP
     * Beta
     * Live
   * Validation: Single selection only

5. Customer Base:
   - Number of paying customers (Number field, required)
   * Validation: Non-negative integers only

6. Revenue Metrics:
   - Monthly recurring revenue (Currency field, optional)
   * Validation: Currency format, allow empty
   * Display: Include currency symbol ($)

7. Technical Team:
   - Current technical team composition (Multiple choice checkboxes, required)
     * Backend Developer
     * Frontend Developer
     * Full Stack Developer
     * DevOps Engineer
     * Data Scientist
     * No technical team yet
     * Other (with text field)
   * Validation: At least one option must be selected

8. Technical Leadership:
   - Do you have a technical co-founder? (Radio buttons, required)
     * Yes
     * No
   * Validation: Single selection only

9. Technical Requirements:
   - What are your most critical technical needs? (Multiple select dropdown, required)
     * Frontend Development
     * Backend Development
     * Mobile Development
     * DevOps/Infrastructure
     * Data Engineering
     * Security Implementation
     * UI/UX Design
     * Other (with text field)
   * Validation: Select up to 3 options

10. Competition Analysis:
    - Top 3 competitors (Three short text fields)
      * Competitor 1 (required)
      * Competitor 2 (optional)
      * Competitor 3 (optional)
    - Key differentiator (Text area, required)
    * Validation: 300 character limit for differentiator

11. Developer Impact:
    - How would additional developers accelerate your timeline? (Text area, required)
    * Validation: 500 character limit

12. Milestone Planning:
    - Technical milestones for first 3 months (Three short text fields, all required)
      * Milestone 1
      * Milestone 2
      * Milestone 3
    * Validation: Each milestone limited to 200 characters
`;

export const questionAnalysisTemplate = `
# Additional Questions Analysis

You are analyzing responses to additional questions in a VC Accelerator application.

## Analysis Criteria
For each question-answer pair, evaluate:
- Relevance (0-100): How well the answer addresses the question
- Completeness (0-100): How thoroughly the answer covers all aspects
- Clarity (0-100): How clear and well-structured the answer is
- Quality (0-100): Overall quality and depth of the response

## Questions and Answers
{{content}}

## Recent Context
{{recentMessages}}

Please provide:
1. Detailed analysis of each question-answer pair
2. Overall score for all responses
3. Summary of key findings
4. Recommendations for improvement
5. Potential follow-up questions where needed
`;

export const scoreEvaluationTemplate = `
# Application Score Evaluation

You are evaluating the scores of a VC Accelerator application. Based on the provided scores, give a comprehensive evaluation and make a final decision.

## Score Breakdown
- Uniqueness Score: {{scores.uniquenessScore}}/100
- Completion Score: {{scores.completionScore}}/100
- Quality Score: {{scores.qualityScore}}/100
- Innovation Score: {{scores.innovationScore}}/100
- Total Score: {{scores.totalScore}}/100

## Application Details
{{#if applicationDetails}}
{{applicationDetails}}
{{else}}
No additional application details were provided.
{{/if}}

## Evaluation Guidelines
- Approved: Total score >= 85 with no individual score below 70
- Pending: Total score between 70-84, or any individual score below 65
- Rejected: Total score < 70, or multiple individual scores below 60

## Instructions
1. Analyze the scores and determine the decision (Approved, Pending, or Rejected)
2. Identify key strengths (3-5 items)
3. Identify areas for improvement (2-4 items)
4. Provide specific recommendations (3-5 items)
5. Write a comprehensive feedback paragraph summarizing the evaluation
`;
