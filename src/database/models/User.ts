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
  AfterLoad,
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

  @Column({
    type: "enum",
    enum: SystemType,
    nullable: true,
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
    nullable: true,
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

  // ==================== ✅ ENHANCED: PROTECT ALL CRITICAL FIELDS ====================
  private _originalBwengeRole: BwengeRole;
  private _originalIsForWhichSystem: SystemType;
  private _originalInstitutionIds: string[];
  private _originalInstitutionRole: InstitutionRole;
  private _originalPrimaryInstitutionId: string;
  private _originalIsInstitutionMember: boolean;

  @AfterLoad()
  storeOriginalValues() {
    console.log(`📋 [User Entity - Ongera] Loading user ${this.id} - storing original values`);
    this._originalBwengeRole = this.bwenge_role;
    this._originalIsForWhichSystem = this.IsForWhichSystem;
    this._originalInstitutionIds = this.institution_ids ? [...this.institution_ids] : [];
    this._originalInstitutionRole = this.institution_role;
    this._originalPrimaryInstitutionId = this.primary_institution_id;
    this._originalIsInstitutionMember = this.is_institution_member;
  }

  @BeforeUpdate()
  protectAllCriticalFields() {
  const monitor = require('../../utils/crossSystemMonitor').crossSystemMonitor;

    console.log(`🛡️ [User Entity - Ongera] Protecting critical fields for user ${this.id}`);
    
  if (this._originalIsForWhichSystem && !this.IsForWhichSystem) {
    monitor.logProtection({
      userId: this.id,
      system: 'ENTITY',
      field: 'IsForWhichSystem',
      action: 'attempted_null',
      oldValue: this._originalIsForWhichSystem,
      newValue: null,
      timestamp: new Date()
    });
    
    console.warn(`⚠️ [PROTECTION] Preventing IsForWhichSystem from being set to null`);
    this.IsForWhichSystem = this._originalIsForWhichSystem;
    
    monitor.logProtection({
      userId: this.id,
      system: 'ENTITY',
      field: 'IsForWhichSystem',
      action: 'protected',
      oldValue: this._originalIsForWhichSystem,
      newValue: this._originalIsForWhichSystem,
      timestamp: new Date()
    });
  }
    
    // Protect BwengeRole (even though Ongera doesn't use it directly)
    if (this._originalBwengeRole && !this.bwenge_role) {
      console.warn(`⚠️ [PROTECTION - ONGERA] Preventing bwenge_role from being set to null - restoring to: ${this._originalBwengeRole}`);
      this.bwenge_role = this._originalBwengeRole;
    }
    
    // Protect institution arrays - only add, never remove
    if (this._originalInstitutionIds && this._originalInstitutionIds.length > 0) {
      if (!this.institution_ids || this.institution_ids.length === 0) {
        console.warn(`⚠️ [PROTECTION - ONGERA] Preventing institution_ids from being cleared - restoring original array`);
        this.institution_ids = [...this._originalInstitutionIds];
      } else {
        // Merge arrays: keep original + add new ones
        const mergedIds = [...new Set([...this._originalInstitutionIds, ...this.institution_ids])];
        if (mergedIds.length > this._originalInstitutionIds.length) {
          console.log(`✅ [PROTECTION - ONGERA] Merging institution_ids: added ${mergedIds.length - this._originalInstitutionIds.length} new institutions`);
          this.institution_ids = mergedIds;
        }
      }
    }
    
    // Protect institution role
    if (this._originalInstitutionRole && !this.institution_role) {
      console.warn(`⚠️ [PROTECTION - ONGERA] Preventing institution_role from being set to null - restoring to: ${this._originalInstitutionRole}`);
      this.institution_role = this._originalInstitutionRole;
    }
    
    // Protect primary institution
    if (this._originalPrimaryInstitutionId && !this.primary_institution_id) {
      console.warn(`⚠️ [PROTECTION - ONGERA] Preventing primary_institution_id from being set to null - restoring to: ${this._originalPrimaryInstitutionId}`);
      this.primary_institution_id = this._originalPrimaryInstitutionId;
    }
    
    // Protect institution member flag
    if (this._originalIsInstitutionMember && !this.is_institution_member) {
      console.warn(`⚠️ [PROTECTION - ONGERA] Preventing is_institution_member from being set to false - restoring to true`);
      this.is_institution_member = true;
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