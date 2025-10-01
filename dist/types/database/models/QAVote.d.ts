import { User } from "./User";
import { QAAnswer } from "./QAAnswer";
export declare enum VoteType {
    UPVOTE = "UPVOTE",
    DOWNVOTE = "DOWNVOTE"
}
export declare class QAVote {
    id: string;
    user: User;
    answer: QAAnswer;
    vote_type: VoteType;
    created_at: Date;
}
