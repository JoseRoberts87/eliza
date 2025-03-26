import { ApplicationStatus } from "./type";

// state machine for application status
export const appStateMachine = {
    [ApplicationStatus.RECEIVED]: ApplicationStatus.FORM_COMPLETED,
    [ApplicationStatus.FORM_COMPLETED]: ApplicationStatus.ADDITIONAL_QUESTIONS,
    [ApplicationStatus.ADDITIONAL_QUESTIONS]: ApplicationStatus.UNIQUE_FORM,
    [ApplicationStatus.UNIQUE_FORM]: ApplicationStatus.SCORED
};
