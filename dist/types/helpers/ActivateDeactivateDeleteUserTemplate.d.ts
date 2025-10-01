interface UserData {
    first_name: string;
    last_name: string;
    email: string;
    account_type: string;
    profile?: {
        institution_name?: string;
        academic_level?: string;
    };
}
export declare class ActivateDeactivateDeleteUserTemplate {
    static getStatusChangeTemplate(userData: UserData, isActivation: boolean, reason?: string): string;
    static getDeletionTemplate(userData: UserData): string;
}
export {};
