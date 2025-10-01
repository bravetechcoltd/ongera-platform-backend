import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinColumn,
  JoinTable,
} from "typeorm";
import { User } from "./User";
import { CommunityPost } from "./CommunityPost";
import { Event } from "./Event";
import { ResearchProject } from "./ResearchProject";

export enum CommunityType {
  PUBLIC = "Public",
  PRIVATE = "Private",
  INSTITUTION_SPECIFIC = "Institution-Specific",
}

@Entity("communities")
export class Community {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  slug: string;
  @Column({ type: "text", nullable: true })
  rules: string;
  @Column({ type: "text" })
  description: string;

  @Column({ nullable: true })
  cover_image_url: string;

  @ManyToOne(() => User, (user) => user.created_communities)
  @JoinColumn({ name: "creator_id" })
  creator: User;

  @Column({
    type: "enum",
    enum: CommunityType,
    default: CommunityType.PUBLIC,
  })
  community_type: CommunityType;

  @Column()
  category: string;

  @Column({ default: 0 })
  member_count: number;

  @Column({ default: 0 })
  post_count: number;

  @CreateDateColumn()
  created_at: Date;

  @Column({ default: true })
  is_active: boolean;

  @Column({ default: false })
  join_approval_required: boolean;

  @ManyToMany(() => User)
  @JoinTable({
    name: "community_members",
    joinColumn: { name: "community_id" },
    inverseJoinColumn: { name: "user_id" },
  })
  members: User[];

  @OneToMany(() => CommunityPost, (post) => post.community)
  posts: CommunityPost[];

  @OneToMany(() => Event, (event) => event.community)
  events: Event[];
  
  @OneToMany(() => ResearchProject, (projects) => projects.community)
  projects: ResearchProject[];
}
