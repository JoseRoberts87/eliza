import { elizaLogger, type Plugin } from "@elizaos/core";
import { formCompletionAction } from "./actions/formCompletion";
import { questionsAnalyzerAction } from "./actions/questionsAnalyzer";
import { uniquenessAssessorAction } from "./actions/uniquenessAssessor";
import { scoreGeneratorAction } from "./actions/scoreGenerator";
import { applicationDecisionAction } from "./actions/applicationDecision";
import { applicationReceivedAction } from "./actions/applicationReceived";

export const formCompletionPlugin: Plugin = {
    name: "form-completion",
    description: "Plugin for completing VC Accelerator application forms",
    actions: [formCompletionAction],
    evaluators: [],
};

export const questionsAnalyzerPlugin: Plugin = {
    name: "questions-analyzer",
    description: "Plugin for analyzing VC Accelerator application questions",
    actions: [questionsAnalyzerAction],
    evaluators: [],
};

export const uniquenessAssessorPlugin: Plugin = {
    name: "uniqueness-assessor",
    description:
        "Plugin for assessing the uniqueness of VC Accelerator application questions",
    actions: [uniquenessAssessorAction],
    evaluators: [],
};

export const scoreGeneratorPlugin: Plugin = {
    name: "score-generator",
    description:
        "Plugin for generating scores for VC Accelerator application forms",
    actions: [scoreGeneratorAction],
    evaluators: [],
};

export const applicationReceivedPlugin: Plugin = {
    name: "application-received",
    description: "Plugin for recording new application receipts",
    actions: [applicationReceivedAction],
    evaluators: [],
    providers: [],
};

export const applicationDecisionPlugin: Plugin = {
    name: "application-decision",
    description:
        "Plugin for evaluating scores and providing recommendations for VC Accelerator application forms",
    actions: [applicationDecisionAction],
    evaluators: [],
};

export default [
    formCompletionPlugin,
    questionsAnalyzerPlugin,
    uniquenessAssessorPlugin,
    scoreGeneratorPlugin,
    applicationDecisionPlugin,
    applicationReceivedPlugin,
];
