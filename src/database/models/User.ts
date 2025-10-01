import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  OneToMany,
  ManyToMany,
  JoinTable,
  BeforeUpdate,
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
import { InstructorStudent } from "./InstructorStudent";
import { UserSession } from "./UserSession";

export enum AccountType {
  STUDENT = "Student",
  RESEARCHER = "Researcher",
  DIASPORA = "Diaspora",
  INSTITUTION = "Institution",
  ADMIN = "admin",
}

  export enum BwengeRole {
    SYSTEM_ADMIN = "SYSTEM_ADMIN",
    INSTITUTION_ADMIN = "INSTITUTION_ADMIN",
    CONTENT_CREATOR = "CONTENT_CREATOR",
    INSTRUCTOR = "INSTRUCTOR",
    LEARNER = "LEARNER",
  }
  
  

export enum SystemType {
  BWENGEPLUS = "bwengeplus",
  ONGERA = "ongera",
}



export enum InstitutionRole {
  ADMIN = "ADMIN",
  CONTENT_CREATOR = "CONTENT_CREATOR",
  INSTRUCTOR = "INSTRUCTOR",
  MEMBER = "MEMBER",
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

  @Column({ default: false })
  isUserLogin: boolean;

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

  // ✅ NEW: System identification field - NO DEFAULT, must be explicitly set
  @Column({
    type: "enum",
    enum: SystemType,
    nullable: true, // NOT NULL - must always have a value
  })
  IsForWhichSystem: SystemType;

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

  @OneToMany(() => InstructorStudent, (link) => link.instructor)
  assignedStudents: InstructorStudent[];

  @OneToMany(() => InstructorStudent, (link) => link.student)
  assignedInstructor: InstructorStudent[];

  @OneToMany(() => UserSession, (session) => session.user)
  sessions: UserSession[];
  @Column({
    type: "enum",
    enum: BwengeRole,
    nullable: true, // NOT NULL but no default
  })
  bwenge_role: BwengeRole;

  
 @Column({ type: "uuid", nullable: true })
  primary_institution_id: string;

  @Column({ default: false })
  is_institution_member: boolean;

  @Column({ type: "simple-array", nullable: true })
  institution_ids: string[];
    @Column({
      type: "enum",
      enum: InstitutionRole,
      nullable: true,
    })
    institution_role: InstitutionRole;


  private _originalBwengeRole: BwengeRole;

  @BeforeUpdate()
  protectBwengeRole() {
    if (!this.bwenge_role && this._originalBwengeRole) {
      console.warn("⚠️ Preventing bwenge_role from being set to null - restoring original value");
      this.bwenge_role = this._originalBwengeRole;
    }
  }

  setOriginalBwengeRole(role: BwengeRole) {
    this._originalBwengeRole = role;
  }
  
  isInstructor(): boolean {
    return this.assignedStudents && this.assignedStudents.length > 0;
  }

  hasAssignedInstructor(): boolean {
    return this.assignedInstructor && this.assignedInstructor.length > 0;
  }

  getStudentCount(): number {
    return this.assignedStudents ? this.assignedStudents.length : 0;
  }
}