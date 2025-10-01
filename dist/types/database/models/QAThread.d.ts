import { QAAnswer } from "./QAAnswer";
import { Community } from "./Community";
import { User } from "./User";
export declare class QAThread {
    id: string;
    asker: User;
    community: Community;
    title: string;
    content: string;
    tags: string[];
    category: string;
    is_answered: boolean;
    best_answer: QAAnswer;
    view_count: number;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
    answers: QAAnswer[];
    answer_count?: number;
}
