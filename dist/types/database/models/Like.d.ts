import { User } from "./User";
export declare enum ContentType {
    PROJECT = "Project",
    POST = "Post",
    COMMENT = "Comment",
    EVENT = "Event"
}
export declare class Like {
    id: string;
    user: User;
    content_type: ContentType;
    content_id: string;
    created_at: Date;
}
