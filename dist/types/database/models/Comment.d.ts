import { User } from "./User";
import { ContentType } from "./Like";
export declare class Comment {
    id: string;
    author: User;
    content_type: ContentType;
    content_id: string;
    parent_comment: Comment;
    replies: Comment[];
    comment_text: string;
    media_url: string;
    is_edited: boolean;
    created_at: Date;
    updated_at: Date;
}
