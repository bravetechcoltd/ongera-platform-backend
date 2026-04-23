import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

@Entity("hero_slides")
@Index("idx_hero_active", ["is_active"])
@Index("idx_hero_order", ["display_order"])
export class HeroSlide {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  title: string;

  @Column({ default: "" })
  eyebrow: string;

  @Column({ type: "text" })
  headline: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ default: "Learn More" })
  cta_text: string;

  @Column({ default: "/register" })
  cta_href: string;

  @Column({ default: "Sparkles" })
  icon_name: string;

  @Column({ nullable: true })
  image_url: string;

  @Column({ nullable: true })
  image_public_id: string;

  @Column({ default: 0 })
  display_order: number;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
