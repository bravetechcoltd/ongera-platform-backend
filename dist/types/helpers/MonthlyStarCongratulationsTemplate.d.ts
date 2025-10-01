export declare class MonthlyStarCongratulationsTemplate {
    static getCongratulationsEmail(data: {
        user: {
            first_name: string;
            email: string;
        };
        badge_image_url: string;
        month: string;
        year: number;
        statistics: {
            projects_count: number;
            blogs_count: number;
            events_count: number;
            followers_count: number;
            total_score: number;
        };
        description: string;
        rewards: string;
        community_name?: string;
    }): string;
}
