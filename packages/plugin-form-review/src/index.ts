import { elizaLogger, type Plugin } from "@elizaos/core";
import { formCompletionAction } from "./actions/formCompletion";
import { questionsAnalyzerAction } from "./actions/questionsAnalyzer";
import { uniquenessAssessorAction } from "./actions/uniquenessAssessor";
import { scoreGeneratorAction } from "./actions/scoreGenerator";

export const formReviewPlugin: Plugin = {
    name: "form-review",
    description: "Plugin for reviewing and analyzing VC Accelerator application forms",
    actions: [
        formCompletionAction,
        questionsAnalyzerAction,
        uniquenessAssessorAction,
        scoreGeneratorAction
    ],
    // No providers, evaluators, or services needed for this plugin
};

elizaLogger.info("Loading form-review plugin");

export default formReviewPlugin; 