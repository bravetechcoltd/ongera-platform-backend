import { User } from "./User";
export declare enum MessageType {
    TEXT = "text",
    IMAGE = "image",
    VIDEO = "video",
    AUDIO = "audio",
    DOCUMENT = "document"
}
export declare enum ChatType {
    COMMUNITY = "community",// Messages visible to all community members
    DIRECT = "direct"
}
export declare class CommunityChatMessage {
    id: string;
    community_id: string;
    sender_id: string;
    sender: User;
    chat_type: ChatType;
    recipient_user_id: string | null;
    recipient_user: User;
    content: string;
    message_type: MessageType;
    file_url: string;
    file_name: string;
    file_type: string;
    reply_to_message_id: string | null;
    reply_to: CommunityChatMessage;
    reactions: Record<string, string>;
    edited: boolean;
    deleted_for_everyone: boolean;
    deleted_by_users: string[];
    read_by: string[];
    created_at: Date;
}
