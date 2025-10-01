import { Event } from "../database/models/Event";
export declare class ActivateDeactivateCancelEventTemplate {
    /**
     * Template for event activation/deactivation
     */
    static getStatusChangeTemplate(event: Event, isActivation: boolean, reason?: string): string;
    /**
     * Template for permanent event cancellation
     */
    static getCancellationTemplate(event: Event, reason: string): string;
}
