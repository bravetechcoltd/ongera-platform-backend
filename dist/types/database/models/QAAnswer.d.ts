import { QAThread } from "./QAThread";
import { User } from "./User";
import { QAVote } from "./QAVote";
export declare class QAAnswer {
    id: string;
    thread: QAThread;
    answerer: User;
    content: string;
    is_accepted: boolean;
    upvotes_count: number;
    created_at: Date;
    updated_at: Date;
    votes: QAVote[];
    user_vote?: string;
}
