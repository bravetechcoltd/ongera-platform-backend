import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  OneToMany,
  ManyToMany,
  JoinTable,
} from "typeorm";
import { UserProfile } from "./UserProfile";
import { ResearchProject } from "./ResearchProject";
import { Community } from "./Community";
import { BlogPost } from "./BlogPost";
import { Comment } from "./Comment";
import { QAThread } from "./QAThread";
import { Like } from "./Like";
import { CommunityPost } from "./CommunityPost";
import { Event } from "./Event";
import { EventAttendee } from "./EventAttendee";
export enum AccountType {
  STUDENT = "Student",
  RESEARCHER = "Researcher",
  DIASPORA = "Diaspora",
  INSTITUTION = "Institution",
  ADMIN = "admin",

}

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password_hash: string;

  @Column({ unique: true, nullable: true })
  username: string;

  @Column({ nullable: true })
  first_name: string;

  @Column({ nullable: true })
  last_name: string;

  @Column({ nullable: true })
  phone_number: string;

  @Column({ nullable: true })
  profile_picture_url: string;

  @Column({ type: "text", nullable: true })
  bio: string;

  @Column({
    type: "enum",
    enum: AccountType,
    default: AccountType.STUDENT,
  })
  account_type: AccountType;

  @Column({ default: false })
  is_verified: boolean;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  date_joined: Date;

  @Column({ type: "timestamp", nullable: true })
  last_login: Date;

  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  social_auth_provider: string;

  @Column({ nullable: true })
  social_auth_id: string;


  @OneToOne(() => UserProfile, (profile) => profile.user)
  profile: UserProfile;

  @OneToMany(() => ResearchProject, (project) => project.author)
  projects: ResearchProject[];

  @OneToMany(() => Community, (community) => community.creator)
  created_communities: Community[];

  @OneToMany(() => Event, (event) => event.organizer)
  organized_events: Event[];

  @OneToMany(() => CommunityPost, (post) => post.author)
  community_posts: CommunityPost[];

  @OneToMany(() => BlogPost, (blog) => blog.author)
  blog_posts: BlogPost[];

  @OneToMany(() => QAThread, (thread) => thread.asker)
  qa_threads: QAThread[];

  @OneToMany(() => Comment, (comment) => comment.author)
  comments: Comment[];

  @OneToMany(() => Like, (like) => like.user)
  likes: Like[];

  @ManyToMany(() => User, (user) => user.following)
  @JoinTable({
    name: "follows",
    joinColumn: { name: "follower_id" },
    inverseJoinColumn: { name: "following_id" },
  })
  followers: User[];

  @ManyToMany(() => User, (user) => user.followers)
  following: User[];

  @OneToMany(() => EventAttendee, (attendee) => attendee.user)
   eventAttendances: EventAttendee[];
}