interface BlogData {
    title: string;
    excerpt: string;
    content: string;
    category: string;
    status: string;
    created_at: Date;
    cover_image_url?: string;
    author: {
        first_name: string;
        last_name: string;
        profile?: {
            institution_name?: string;
        };
    };
    community: {
        name: string;
        member_count: number;
    };
    view_count?: number;
    reading_time_minutes?: number;
    blog_id: string;
}
interface MemberData {
    first_name: string;
}
export declare class NewsBlogCreatedTemplate {
    static getBlogCreatedTemplate(blogData: BlogData, memberData: MemberData): string;
}
export {};
