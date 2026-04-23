// @ts-nocheck
import { Request, Response } from "express";
import dbConnection from "../database/db";
import { HeroSlide } from "../database/models/HeroSlide";
import { UploadToCloud, DeleteFromCloud } from "../helpers/cloud";

export class HeroSlideController {
  // ✅ CREATE - Admin only
  static async createHeroSlide(req: Request, res: Response) {
    try {
      const {
        title,
        eyebrow,
        headline,
        description,
        cta_text,
        cta_href,
        icon_name,
        display_order,
        is_active,
      } = req.body;

      if (!title || !headline) {
        return res.status(400).json({
          success: false,
          message: "Title and headline are required",
        });
      }

      const heroRepo = dbConnection.getRepository(HeroSlide);

      const slide = heroRepo.create({
        title,
        eyebrow: eyebrow || "",
        headline,
        description: description || null,
        cta_text: cta_text || "Learn More",
        cta_href: cta_href || "/register",
        icon_name: icon_name || "Sparkles",
        display_order: display_order ? Number(display_order) : 0,
        is_active: is_active === undefined ? true : (is_active === true || is_active === "true"),
      });

      // Upload image to cloudinary if provided
      if (req.file) {
        const uploadResult = await UploadToCloud(req.file);
        slide.image_url = uploadResult.secure_url;
        slide.image_public_id = uploadResult.public_id;
      }

      await heroRepo.save(slide);

      return res.status(201).json({
        success: true,
        message: "Hero slide created successfully",
        data: { slide },
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: "Failed to create hero slide",
        error: error.message,
      });
    }
  }

  // ✅ READ - Public: Get all active slides for the landing page
  static async getPublicHeroSlides(req: Request, res: Response) {
    try {
      const heroRepo = dbConnection.getRepository(HeroSlide);
      const slides = await heroRepo.find({
        where: { is_active: true },
        order: { display_order: "ASC", created_at: "DESC" },
      });

      return res.json({
        success: true,
        data: { slides },
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch hero slides",
        error: error.message,
      });
    }
  }

  // ✅ READ - Admin: All slides (active + inactive)
  static async getAllHeroSlides(req: Request, res: Response) {
    try {
      const heroRepo = dbConnection.getRepository(HeroSlide);
      const slides = await heroRepo.find({
        order: { display_order: "ASC", created_at: "DESC" },
      });

      return res.json({
        success: true,
        data: { slides, total: slides.length },
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch hero slides",
        error: error.message,
      });
    }
  }

  // ✅ READ - Single slide by ID
  static async getHeroSlideById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const heroRepo = dbConnection.getRepository(HeroSlide);
      const slide = await heroRepo.findOne({ where: { id } });

      if (!slide) {
        return res.status(404).json({
          success: false,
          message: "Hero slide not found",
        });
      }

      return res.json({
        success: true,
        data: { slide },
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch hero slide",
        error: error.message,
      });
    }
  }

  // ✅ UPDATE - Admin
  static async updateHeroSlide(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const heroRepo = dbConnection.getRepository(HeroSlide);
      const slide = await heroRepo.findOne({ where: { id } });

      if (!slide) {
        return res.status(404).json({
          success: false,
          message: "Hero slide not found",
        });
      }

      const {
        title,
        eyebrow,
        headline,
        description,
        cta_text,
        cta_href,
        icon_name,
        display_order,
        is_active,
      } = req.body;

      if (title !== undefined) slide.title = title;
      if (eyebrow !== undefined) slide.eyebrow = eyebrow;
      if (headline !== undefined) slide.headline = headline;
      if (description !== undefined) slide.description = description;
      if (cta_text !== undefined) slide.cta_text = cta_text;
      if (cta_href !== undefined) slide.cta_href = cta_href;
      if (icon_name !== undefined) slide.icon_name = icon_name;
      if (display_order !== undefined) slide.display_order = Number(display_order);
      if (is_active !== undefined) {
        slide.is_active = is_active === true || is_active === "true";
      }

      // If a new image is uploaded, replace the old one
      if (req.file) {
        if (slide.image_public_id) {
          try {
            await DeleteFromCloud(slide.image_public_id, "image");
          } catch (e) {
            // ignore deletion errors
          }
        }
        const uploadResult = await UploadToCloud(req.file);
        slide.image_url = uploadResult.secure_url;
        slide.image_public_id = uploadResult.public_id;
      }

      await heroRepo.save(slide);

      return res.json({
        success: true,
        message: "Hero slide updated successfully",
        data: { slide },
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: "Failed to update hero slide",
        error: error.message,
      });
    }
  }

  // ✅ DELETE - Admin
  static async deleteHeroSlide(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const heroRepo = dbConnection.getRepository(HeroSlide);
      const slide = await heroRepo.findOne({ where: { id } });

      if (!slide) {
        return res.status(404).json({
          success: false,
          message: "Hero slide not found",
        });
      }

      // Remove the image from cloudinary
      if (slide.image_public_id) {
        try {
          await DeleteFromCloud(slide.image_public_id, "image");
        } catch (e) {
          // ignore
        }
      }

      await heroRepo.remove(slide);

      return res.json({
        success: true,
        message: "Hero slide deleted successfully",
        data: { id },
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: "Failed to delete hero slide",
        error: error.message,
      });
    }
  }

  // ✅ Toggle active state
  static async toggleHeroSlideStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const heroRepo = dbConnection.getRepository(HeroSlide);
      const slide = await heroRepo.findOne({ where: { id } });

      if (!slide) {
        return res.status(404).json({
          success: false,
          message: "Hero slide not found",
        });
      }

      slide.is_active = !slide.is_active;
      await heroRepo.save(slide);

      return res.json({
        success: true,
        message: `Hero slide ${slide.is_active ? "activated" : "deactivated"} successfully`,
        data: { slide },
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: "Failed to toggle hero slide status",
        error: error.message,
      });
    }
  }
}
