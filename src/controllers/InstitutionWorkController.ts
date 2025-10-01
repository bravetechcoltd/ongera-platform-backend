// @ts-nocheck
import { Request, Response } from "express";
import dbConnection from "../database/db";
import { InstitutionWork, WorkType, PartnershipStatus } from "../database/models/InstitutionWork";
import { UploadToCloud } from "../helpers/cloud";
import { Like } from "typeorm";

export class InstitutionWorkController {
  
  static async create(req: Request, res: Response) {
    try {
      const {
        name,
        description,
        website_url,
        work_type,
        status,
        contact_email,
        contact_phone,
        address,
        social_links,
        metadata,
      } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          message: "Institution name is required",
        });
      }

      const workRepo = dbConnection.getRepository(InstitutionWork);

      const existing = await workRepo.findOne({ where: { name } });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: "Institution with this name already exists",
        });
      }

      let logo_url = null;
      if (req.file) {
        try {
          const uploadResult = await UploadToCloud(req.file);
          logo_url = uploadResult.secure_url;
        } catch (uploadError) {
        }
      }

      let parsedSocialLinks = {};
      if (social_links) {
        try {
          parsedSocialLinks = typeof social_links === 'string' 
            ? JSON.parse(social_links) 
            : social_links;
        } catch (e) {
        }
      }

      let parsedMetadata = {};
      if (metadata) {
        try {
          parsedMetadata = typeof metadata === 'string' 
            ? JSON.parse(metadata) 
            : metadata;
        } catch (e) {
        }
      }

      const institutionWork = workRepo.create({
        name,
        description,
        logo_url,
        website_url,
        work_type: work_type || WorkType.OTHER,
        status: status || PartnershipStatus.ACTIVE,
        contact_email,
        contact_phone,
        address,
        social_links: parsedSocialLinks,
        metadata: parsedMetadata,
        is_active: true,
      });

      await workRepo.save(institutionWork);

      res.status(201).json({
        success: true,
        message: "Institution work created successfully",
        data: institutionWork,
      });

    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to create institution work",
        error: error.message,
      });
    }
  }

  static async getAll(req: Request, res: Response) {
    try {
      const { page = 1, limit = 20, search, work_type, status } = req.query;

      const workRepo = dbConnection.getRepository(InstitutionWork);
      const queryBuilder = workRepo.createQueryBuilder("institution_work");

      if (search) {
        queryBuilder.andWhere(
          "(institution_work.name ILIKE :search OR institution_work.description ILIKE :search)",
          { search: `%${search}%` }
        );
      }

      if (work_type) {
        queryBuilder.andWhere("institution_work.work_type = :work_type", { work_type });
      }

      if (status) {
        queryBuilder.andWhere("institution_work.status = :status", { status });
      }

      const total = await queryBuilder.getCount();

      const skip = (Number(page) - 1) * Number(limit);
      const institutions = await queryBuilder
        .orderBy("institution_work.created_at", "DESC")
        .skip(skip)
        .take(Number(limit))
        .getMany();

      res.json({
        success: true,
        data: {
          institutions,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages: Math.ceil(total / Number(limit)),
          },
        },
      });

    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch institution works",
        error: error.message,
      });
    }
  }

  static async getActiveForHomepage(req: Request, res: Response) {
    try {
      const workRepo = dbConnection.getRepository(InstitutionWork);
      
      const institutions = await workRepo.find({
        where: { 
          is_active: true,
          status: PartnershipStatus.ACTIVE,
        },
        order: { name: "ASC" },
      });

      res.json({
        success: true,
        data: institutions,
      });

    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch active institution works",
        error: error.message,
      });
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const workRepo = dbConnection.getRepository(InstitutionWork);
      const institution = await workRepo.findOne({ where: { id } });

      if (!institution) {
        return res.status(404).json({
          success: false,
          message: "Institution work not found",
        });
      }

      res.json({
        success: true,
        data: institution,
      });

    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch institution work",
        error: error.message,
      });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const workRepo = dbConnection.getRepository(InstitutionWork);
      const institution = await workRepo.findOne({ where: { id } });

      if (!institution) {
        return res.status(404).json({
          success: false,
          message: "Institution work not found",
        });
      }

      if (req.file) {
        try {
          const uploadResult = await UploadToCloud(req.file);
          updates.logo_url = uploadResult.secure_url;
        } catch (uploadError) {
        }
      }

      if (updates.social_links && typeof updates.social_links === 'string') {
        try {
          updates.social_links = JSON.parse(updates.social_links);
        } catch (e) {
          delete updates.social_links;
        }
      }

      if (updates.metadata && typeof updates.metadata === 'string') {
        try {
          updates.metadata = JSON.parse(updates.metadata);
        } catch (e) {
          delete updates.metadata;
        }
      }

      Object.assign(institution, updates);
      await workRepo.save(institution);

      res.json({
        success: true,
        message: "Institution work updated successfully",
        data: institution,
      });

    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to update institution work",
        error: error.message,
      });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const workRepo = dbConnection.getRepository(InstitutionWork);
      const institution = await workRepo.findOne({ where: { id } });

      if (!institution) {
        return res.status(404).json({
          success: false,
          message: "Institution work not found",
        });
      }

      await workRepo.remove(institution);

      res.json({
        success: true,
        message: "Institution work deleted successfully",
      });

    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to delete institution work",
        error: error.message,
      });
    }
  }

  static async toggleActive(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const workRepo = dbConnection.getRepository(InstitutionWork);
      const institution = await workRepo.findOne({ where: { id } });

      if (!institution) {
        return res.status(404).json({
          success: false,
          message: "Institution work not found",
        });
      }

      institution.is_active = !institution.is_active;
      await workRepo.save(institution);

      res.json({
        success: true,
        message: `Institution ${institution.is_active ? 'activated' : 'deactivated'} successfully`,
        data: institution,
      });

    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to toggle active status",
        error: error.message,
      });
    }
  }
}