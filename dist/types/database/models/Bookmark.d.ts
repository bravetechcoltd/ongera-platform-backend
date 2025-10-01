import { User } from "./User";
import { ContentType } from "./Like";
export declare class Bookmark {
    id: string;
    user: User;
    content_type: ContentType;
    content_id: string;
    created_at: Date;
}
