import { ResearchProject } from "./ResearchProject";
export declare enum TagCategory {
    FIELD = "Field",
    METHOD = "Method",
    TOPIC = "Topic",
    REGION = "Region"
}
export declare class ProjectTag {
    id: string;
    name: string;
    slug: string;
    description: string;
    usage_count: number;
    category: TagCategory;
    projects: ResearchProject[];
}
