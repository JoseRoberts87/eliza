export const formCompletionTemplate = `
# Form Completion Check

You are validating a VC Accelerator application form. Please check the following aspects:

## Required Fields
- Company name
- Company description (min 50 characters)
- At least one founder with:
  - Name
  - Email
  - Role

## Optional Fields
- Pitch deck URL
- Additional information

## Recent Messages
{{recentMessages}}

## Current Application
{{content}}

Please analyze the application and provide:
1. Whether the form is complete
2. Any missing required fields
3. Any validation errors
4. A completion score (0-100)
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
