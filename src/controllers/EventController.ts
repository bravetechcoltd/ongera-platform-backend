// @ts-nocheck

import { Request, Response } from "express";
import dbConnection from '../database/db';
import { Event, EventStatus } from "../database/models/Event";
import { EventAttendee, RegistrationStatus } from "../database/models/EventAttendee";
import { EventAgenda } from "../database/models/EventAgenda";
import { UploadToCloud } from "../helpers/cloud";
import { sendEmail } from '../helpers/utils';
import { NewsEventCreatedTemplate } from '../helpers/NewsEventCreatedTemplate';
import {ActivateDeactivateCancelEventTemplate} from "../helpers/ActivateDeactivateCancelEventTemplate"; 
import { Community } from "../database/models/Community";
import { User } from "../database/models/User";
import { SubscribeController } from './SubscribeController';
import {AdminEventManagementTemplates} from "../helpers/AdminEventManagementTemplates"; 
import { In } from "typeorm";

export class EventController {
static async createCommunityEvent(req: Request, res: Response) {
  try {
    const { community_id } = req.params;
    const userId = req.user.userId;
    const {
      title, description, event_type, event_mode,
      start_datetime, end_datetime, timezone,
      location_address, online_meeting_url,
      max_attendees, is_free, price_amount,
      requires_approval, linked_project_ids
    } = req.body;

    const communityRepo = dbConnection.getRepository(Community);
    const community = await communityRepo.findOne({
      where: { id: community_id },
      relations: ["members", "creator", "members.profile"]
    });

    if (!community) {
      return res.status(404).json({
        success: false,
        message: "Community not found"
      });
    }

    const isMember = community.members?.some(m => m.id === userId) || 
                    community.creator.id === userId;

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: "Only community members can create events"
      });
    }

    const eventRepo = dbConnection.getRepository(Event);
    
    const event = eventRepo.create({
      title,
      description,
      event_type,
      event_mode,
      start_datetime,
      end_datetime,
      timezone,
      location_address,
      online_meeting_url,
      max_attendees: max_attendees ? parseInt(max_attendees) : null,
      is_free: is_free === 'true' || is_free === true,
      price_amount: price_amount ? parseFloat(price_amount) : null,
      requires_approval: requires_approval === 'true' || requires_approval === true,
      organizer: { id: userId },
      community: { id: community_id },
    });

    if (req.file) {
      const uploadResult = await UploadToCloud(req.file);
      event.cover_image_url = uploadResult.secure_url;
    }

    await eventRepo.save(event);

    if (linked_project_ids && Array.isArray(linked_project_ids)) {
      event.linked_projects = linked_project_ids.map(id => ({ id } as any));
      await eventRepo.save(event);
    }

    const completeEvent = await eventRepo.findOne({
      where: { id: event.id },
      relations: ["organizer", "organizer.profile", "community"]
    });

    try {
      const membersToNotify = community.members.filter(member => member.id !== userId);
      
      if (membersToNotify.length === 0) {
      } else {
        let emailsSent = 0;
        let emailsFailed = 0;
        const failedEmails: Array<{ email: string; error: string }> = [];

        for (let i = 0; i < membersToNotify.length; i++) {
          const member = membersToNotify[i];

          try {
            const eventData = {
              title: completeEvent!.title,
              description: completeEvent!.description,
              event_type: completeEvent!.event_type,
              event_mode: completeEvent!.event_mode,
              start_datetime: completeEvent!.start_datetime,
              end_datetime: completeEvent!.end_datetime,
              timezone: completeEvent!.timezone,
              location_address: completeEvent!.location_address,
              online_meeting_url: completeEvent!.online_meeting_url,
              cover_image_url: completeEvent!.cover_image_url,
              is_free: completeEvent!.is_free,
              price_amount: completeEvent!.price_amount,
              max_attendees: completeEvent!.max_attendees,
              requires_approval: completeEvent!.requires_approval,
              organizer: {
                first_name: completeEvent!.organizer.first_name,
                last_name: completeEvent!.organizer.last_name,
                profile: completeEvent!.organizer.profile
              },
              community: {
                name: completeEvent!.community.name,
                member_count: completeEvent!.community.member_count
              },
              event_id: completeEvent!.id
            };

            const memberData = {
              first_name: member.first_name
            };

            const emailHtml = NewsEventCreatedTemplate.getEventCreatedTemplate(
              eventData,
              memberData
            );

            await sendEmail({
              to: member.email,
              subject: `📅 New Event: ${completeEvent!.title}`,
              html: emailHtml
            });

            emailsSent++;

            await new Promise(resolve => setTimeout(resolve, 100));

          } catch (emailError: any) {
            emailsFailed++;
            const errorMsg = emailError.message || 'Unknown error';
            
            failedEmails.push({
              email: member.email,
              error: errorMsg
            });
          }
        }
      }

    } catch (emailSystemError: any) {
    }

    try {
      const subscriberNotificationData = {
        title: completeEvent!.title,
        description: completeEvent!.description,
        event_type: completeEvent!.event_type,
        event_mode: completeEvent!.event_mode,
        start_datetime: completeEvent!.start_datetime,
        end_datetime: completeEvent!.end_datetime,
        timezone: completeEvent!.timezone,
        location_address: completeEvent!.location_address,
        online_meeting_url: completeEvent!.online_meeting_url,
        organizer: {
          first_name: completeEvent!.organizer.first_name,
          last_name: completeEvent!.organizer.last_name
        },
        community: {
          name: completeEvent!.community.name
        },
        event_id: completeEvent!.id,
        created_at: completeEvent!.created_at
      };

      SubscribeController.notifyNewEvent(subscriberNotificationData)
        .catch(err => {
        });

    } catch (subscriberError: any) {
    }

    res.status(201).json({
      success: true,
      message: "Community event created successfully and notifications sent",
      data: { event: completeEvent },
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      message: "Failed to create community event", 
      error: error.message 
    });
  }
}

  static async getCommunityEvents(req: Request, res: Response) {
    try {
      const { community_id } = req.params;
      const { page = 1, limit = 10, status, event_type } = req.query;

      const eventRepo = dbConnection.getRepository(Event);
      
      const queryBuilder = eventRepo.createQueryBuilder("event")
        .leftJoinAndSelect("event.organizer", "organizer")
        .leftJoinAndSelect("event.community", "community")
        .leftJoinAndSelect("event.attendees", "attendees")
        .leftJoinAndSelect("attendees.user", "attendeeUser")
        .leftJoinAndSelect("event.agenda_items", "agenda_items")
        .where("event.community.id = :community_id", { community_id })
        .andWhere("event.status != :deleted", { deleted: "Deleted" });

      if (status) {
        queryBuilder.andWhere("event.status = :status", { status });
      }

      if (event_type) {
        queryBuilder.andWhere("event.event_type = :event_type", { event_type });
      }

      const skip = (Number(page) - 1) * Number(limit);
      queryBuilder.skip(skip).take(Number(limit));
      queryBuilder.orderBy("event.start_datetime", "ASC");

      const [events, total] = await queryBuilder.getManyAndCount();

      res.json({
        success: true,
        data: {
          events,
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
        message: "Failed to fetch community events", 
        error: error.message 
      });
    }
  }

  static async createEvent(req: Request, res: Response) {
    try {
      const userId = req.user.userId;
      const {
        title, description, event_type, event_mode,
        start_datetime, end_datetime, timezone,
        location_address, online_meeting_url,
        max_attendees, is_free, price_amount,
        requires_approval, community_id, linked_project_ids
      } = req.body;

      const eventRepo = dbConnection.getRepository(Event);
      
      const event = eventRepo.create({
        title,
        description,
        event_type,
        event_mode,
        start_datetime,
        end_datetime,
        timezone,
        location_address,
        online_meeting_url,
        max_attendees: max_attendees ? parseInt(max_attendees) : null,
        is_free: is_free === 'true' || is_free === true,
        price_amount: price_amount ? parseFloat(price_amount) : null,
        requires_approval: requires_approval === 'true' || requires_approval === true,
        organizer: { id: userId },
        community: community_id ? { id: community_id } : null,
      });

      if (req.file) {
        const uploadResult = await UploadToCloud(req.file);
        event.cover_image_url = uploadResult.secure_url;
      }

      await eventRepo.save(event);

      if (linked_project_ids && Array.isArray(linked_project_ids)) {
        event.linked_projects = linked_project_ids.map(id => ({ id } as any));
        await eventRepo.save(event);
      }

      res.status(201).json({
        success: true,
        message: "Event created successfully",
        data: { event },
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        message: "Failed to create event", 
        error: error.message 
      });
    }
  }
  
  static async getAllEvents(req: Request, res: Response) {
    try {
      const { page = 1, limit = 10, search, event_type, status, event_mode } = req.query;

      const eventRepo = dbConnection.getRepository(Event);
      const queryBuilder = eventRepo.createQueryBuilder("event")
        .leftJoinAndSelect("event.organizer", "organizer")
        .leftJoinAndSelect("event.community", "community")
        .leftJoinAndSelect("event.attendees", "attendees")
        .leftJoinAndSelect("attendees.user", "attendeeUser")
        .leftJoinAndSelect("event.agenda_items", "agenda_items")
        .where("event.status != :cancelled", { cancelled: "Cancelled" })

      if (search) {
        queryBuilder.andWhere(
          "(event.title ILIKE :search OR event.description ILIKE :search)",
          { search: `%${search}%` }
        );
      }

      if (event_type) {
        queryBuilder.andWhere("event.event_type = :event_type", { event_type });
      }

      if (status) {
        queryBuilder.andWhere("event.status = :status", { status });
      }

      if (event_mode) {
        queryBuilder.andWhere("event.event_mode = :event_mode", { event_mode });
      }

      const skip = (Number(page) - 1) * Number(limit);
      queryBuilder.skip(skip).take(Number(limit));
      queryBuilder.orderBy("event.start_datetime", "ASC");

      const [events, total] = await queryBuilder.getManyAndCount();

      res.json({
        success: true,
        data: {
          events,
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
        message: "Failed to fetch events", 
        error: error.message 
      });
    }
  }

  static async getMyEvents(req: Request, res: Response) {
    try {
      const userId = req.user.userId;
      const { page = 1, limit = 10, type = 'attending' } = req.query;

      const eventRepo = dbConnection.getRepository(Event);
      const attendeeRepo = dbConnection.getRepository(EventAttendee);

      let events: Event[];
      let total: number;

      if (type === 'organizing') {
        const queryBuilder = eventRepo.createQueryBuilder("event")
          .leftJoinAndSelect("event.organizer", "organizer")
          .leftJoinAndSelect("event.community", "community")
          .leftJoinAndSelect("event.attendees", "attendees")
          .leftJoinAndSelect("attendees.user", "attendeeUser")
          .leftJoinAndSelect("event.agenda_items", "agenda_items")
          .where("event.organizer.id = :userId", { userId })
          .andWhere("event.status != :deleted", { deleted: "Deleted" });

        const skip = (Number(page) - 1) * Number(limit);
        queryBuilder.skip(skip).take(Number(limit));
        queryBuilder.orderBy("event.start_datetime", "ASC");

        [events, total] = await queryBuilder.getManyAndCount();
      } else {
        const attendeeQuery = attendeeRepo.createQueryBuilder("attendee")
          .leftJoinAndSelect("attendee.event", "event")
          .leftJoinAndSelect("event.organizer", "organizer")
          .leftJoinAndSelect("event.community", "community")
          .leftJoinAndSelect("event.attendees", "attendees")
          .leftJoinAndSelect("attendees.user", "attendeeUser")
          .leftJoinAndSelect("event.agenda_items", "agenda_items")
          .where("attendee.user.id = :userId", { userId })
          .andWhere("event.status != :deleted", { deleted: "Deleted" });

        const skip = (Number(page) - 1) * Number(limit);
        attendeeQuery.skip(skip).take(Number(limit));
        attendeeQuery.orderBy("event.start_datetime", "ASC");

        const [attendees, attendeeTotal] = await attendeeQuery.getManyAndCount();
        events = attendees.map(attendee => attendee.event);
        total = attendeeTotal;
      }

      res.json({
        success: true,
        data: {
          events,
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
        message: "Failed to fetch your events", 
        error: error.message 
      });
    }
  }

  static async getEventById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const eventRepo = dbConnection.getRepository(Event);
      const event = await eventRepo.findOne({
        where: { id },
        relations: [
          "organizer", 
          "community", 
          "attendees", 
          "attendees.user",
          "agenda_items",
          "agenda_items.speaker",
          "linked_projects"
        ],
      });

      if (!event) {
        return res.status(404).json({ 
          success: false, 
          message: "Event not found" 
        });
      }

      res.json({
        success: true,
        data: { event },
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        message: "Failed to fetch event", 
        error: error.message 
      });
    }
  }

  static async updateEvent(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      const updateData = req.body;

      const eventRepo = dbConnection.getRepository(Event);
      const event = await eventRepo.findOne({
        where: { id },
        relations: ["organizer"],
      });

      if (!event) {
        return res.status(404).json({ 
          success: false, 
          message: "Event not found" 
        });
      }

      if (event.organizer.id !== userId) {
        return res.status(403).json({ 
          success: false, 
          message: "You can only update events you organized" 
        });
      }

      if (updateData.title) event.title = updateData.title;
      if (updateData.description) event.description = updateData.description;
      if (updateData.event_type) event.event_type = updateData.event_type;
      if (updateData.event_mode) event.event_mode = updateData.event_mode;
      if (updateData.start_datetime) event.start_datetime = new Date(updateData.start_datetime);
      if (updateData.end_datetime) event.end_datetime = new Date(updateData.end_datetime);
      if (updateData.timezone) event.timezone = updateData.timezone;
      if (updateData.location_address !== undefined) event.location_address = updateData.location_address;
      if (updateData.online_meeting_url !== undefined) event.online_meeting_url = updateData.online_meeting_url;
      if (updateData.max_attendees !== undefined) event.max_attendees = updateData.max_attendees ? parseInt(updateData.max_attendees) : null;
      if (updateData.is_free !== undefined) event.is_free = updateData.is_free === 'true' || updateData.is_free === true;
      if (updateData.price_amount !== undefined) event.price_amount = updateData.price_amount ? parseFloat(updateData.price_amount) : null;
      if (updateData.requires_approval !== undefined) event.requires_approval = updateData.requires_approval === 'true' || updateData.requires_approval === true;
      if (updateData.status) event.status = updateData.status;

      if (req.file) {
        const uploadResult = await UploadToCloud(req.file);
        event.cover_image_url = uploadResult.secure_url;
      }

      if (updateData.linked_project_ids) {
        const projectIds = Array.isArray(updateData.linked_project_ids) 
          ? updateData.linked_project_ids 
          : JSON.parse(updateData.linked_project_ids);
        event.linked_projects = projectIds.map((projectId: string) => ({ id: projectId } as any));
      }

      await eventRepo.save(event);

      res.json({
        success: true,
        message: "Event updated successfully",
        data: { event },
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        message: "Failed to update event", 
        error: error.message 
      });
    }
  }

static async deleteEvent(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const eventRepo = dbConnection.getRepository(Event);
    
    const event = await eventRepo.findOne({
      where: { id },
      relations: ["organizer"],
    });

    if (!event) {
      return res.status(404).json({ 
        success: false, 
        message: "Event not found" 
      });
    }

    await eventRepo.remove(event);

    res.json({
      success: true,
      message: "Event permanently deleted successfully",
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      message: "Failed to delete event", 
      error: error.message 
    });
  }
}

static async registerForEvent(req: any, res: any) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    const attendeeData = {
      event_id: id,
      user_id: userId,
      additional_notes: req.body.additional_notes || null,
      dietary_requirements: req.body.dietary_requirements || null,
      special_accommodations: req.body.special_accommodations || null,
    };

    if (!attendeeData.event_id) {
      return res.status(400).json({
        success: false,
        message: "Event ID is required"
      });
    }

    if (!attendeeData.user_id) {
      return res.status(400).json({
        success: false,
        message: "User ID is required"
      });
    }

    const eventRepo = dbConnection.getRepository(Event);
    const attendeeRepo = dbConnection.getRepository(EventAttendee);

    const event = await eventRepo.findOne({
      where: { id },
      relations: ["attendees"],
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    if (event.status === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cannot register for a cancelled event"
      });
    }

    if (event.registration_deadline && new Date() > new Date(event.registration_deadline)) {
      return res.status(400).json({
        success: false,
        message: "Registration deadline has passed"
      });
    }

    if (event.max_attendees && event.attendees.length >= event.max_attendees) {
      return res.status(400).json({
        success: false,
        message: "Event is at full capacity"
      });
    }

    const existingAttendee = await attendeeRepo.findOne({
      where: { event: { id }, user: { id: userId } },
    });

    if (existingAttendee) {
      return res.status(400).json({
        success: false,
        message: "Already registered for this event"
      });
    }

    const registrationStatus = event.requires_approval 
      ? RegistrationStatus.REGISTERED 
      : RegistrationStatus.APPROVED;

    const attendeeToSave = {
      event: { id: attendeeData.event_id },
      user: { id: attendeeData.user_id },
      registration_status: registrationStatus,
      registered_at: new Date(),
      approval_note: attendeeData.additional_notes,
    };

    const attendee = attendeeRepo.create(attendeeToSave);

    await attendeeRepo.save(attendee);

    const responseData = {
      requires_approval: event.requires_approval,
      registration_status: attendee.registration_status,
      attendee_id: attendee.id,
      event_id: event.id,
      user_id: userId,
      registered_at: attendee.registered_at,
    };

    res.json({
      success: true,
      message: event.requires_approval
        ? "Registration submitted for approval"
        : "Registered for event successfully",
      data: responseData
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to register for event",
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? {
        errorName: error.name,
        driverErrorCode: error.driverError?.code,
        stack: error.stack
      } : undefined
    });
  }
}

  static async unregisterFromEvent(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const attendeeRepo = dbConnection.getRepository(EventAttendee);

      const attendee = await attendeeRepo.findOne({
        where: { 
          event: { id }, 
          user: { id: userId } 
        },
        relations: ["event"],
      });

      if (!attendee) {
        return res.status(404).json({ 
          success: false, 
          message: "Registration not found" 
        });
      }

      await attendeeRepo.remove(attendee);

      res.json({
        success: true,
        message: "Registration cancelled successfully",
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        message: "Failed to cancel registration", 
        error: error.message 
      });
    }
  }

  static async addAgendaItem(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      const {
        session_title, description, speaker_name,
        start_time, end_time, session_type, linked_project_id, display_order
      } = req.body;

      const eventRepo = dbConnection.getRepository(Event);
      const agendaRepo = dbConnection.getRepository(EventAgenda);

      const event = await eventRepo.findOne({
        where: { id },
        relations: ["organizer"],
      });

      if (!event) {
        return res.status(404).json({ 
          success: false, 
          message: "Event not found" 
        });
      }

      if (event.organizer.id !== userId) {
        return res.status(403).json({ 
          success: false, 
          message: "You can only add agenda items to events you organized" 
        });
      }

      const agendaItem = agendaRepo.create({
        session_title,
        description,
        speaker_name,
        start_time,
        end_time,
        session_type,
        display_order: display_order || 0,
        event: { id },
        linked_project: linked_project_id ? { id: linked_project_id } : null,
      });

      await agendaRepo.save(agendaItem);

      res.status(201).json({
        success: true,
        message: "Agenda item added successfully",
        data: { agendaItem },
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        message: "Failed to add agenda item", 
        error: error.message 
      });
    }
  }

  static async updateAgendaItem(req: Request, res: Response) {
    try {
      const { id, agendaId } = req.params;
      const userId = req.user.userId;
      const updateData = req.body;

      const eventRepo = dbConnection.getRepository(Event);
      const agendaRepo = dbConnection.getRepository(EventAgenda);

      const event = await eventRepo.findOne({
        where: { id },
        relations: ["organizer"],
      });

      if (!event) {
        return res.status(404).json({ 
          success: false, 
          message: "Event not found" 
        });
      }

      if (event.organizer.id !== userId) {
        return res.status(403).json({ 
          success: false, 
          message: "You can only update agenda items for events you organized" 
        });
      }

      const agendaItem = await agendaRepo.findOne({
        where: { id: agendaId, event: { id } },
      });

      if (!agendaItem) {
        return res.status(404).json({ 
          success: false, 
          message: "Agenda item not found" 
        });
      }

      if (updateData.session_title) agendaItem.session_title = updateData.session_title;
      if (updateData.description !== undefined) agendaItem.description = updateData.description;
      if (updateData.speaker_name !== undefined) agendaItem.speaker_name = updateData.speaker_name;
      if (updateData.start_time) agendaItem.start_time = updateData.start_time;
      if (updateData.end_time) agendaItem.end_time = updateData.end_time;
      if (updateData.session_type) agendaItem.session_type = updateData.session_type;
      if (updateData.display_order !== undefined) agendaItem.display_order = parseInt(updateData.display_order);

      await agendaRepo.save(agendaItem);

      res.json({
        success: true,
        message: "Agenda item updated successfully",
        data: { agendaItem },
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        message: "Failed to update agenda item", 
        error: error.message 
      });
    }
  }

  static async deleteAgendaItem(req: Request, res: Response) {
    try {
      const { id, agendaId } = req.params;
      const userId = req.user.userId;

      const eventRepo = dbConnection.getRepository(Event);
      const agendaRepo = dbConnection.getRepository(EventAgenda);

      const event = await eventRepo.findOne({
        where: { id },
        relations: ["organizer"],
      });

      if (!event) {
        return res.status(404).json({ 
          success: false, 
          message: "Event not found" 
        });
      }

      if (event.organizer.id !== userId) {
        return res.status(403).json({ 
          success: false, 
          message: "You can only delete agenda items from events you organized" 
        });
      }

      const agendaItem = await agendaRepo.findOne({
        where: { id: agendaId, event: { id } },
      });

      if (!agendaItem) {
        return res.status(404).json({ 
          success: false, 
          message: "Agenda item not found" 
        });
      }

      await agendaRepo.remove(agendaItem);

      res.json({
        success: true,
        message: "Agenda item deleted successfully",
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        message: "Failed to delete agenda item", 
        error: error.message 
      });
    }
  }

  static async getEventAttendees(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      const { page = 1, limit = 20, status } = req.query;

      const eventRepo = dbConnection.getRepository(Event);
      const attendeeRepo = dbConnection.getRepository(EventAttendee);

      const event = await eventRepo.findOne({
        where: { id },
        relations: ["organizer"],
      });

      if (!event) {
        return res.status(404).json({ 
          success: false, 
          message: "Event not found" 
        });
      }

      if (event.organizer.id !== userId) {
        return res.status(403).json({ 
          success: false, 
          message: "You can only view attendees for events you organized" 
        });
      }

      const queryBuilder = attendeeRepo.createQueryBuilder("attendee")
        .leftJoinAndSelect("attendee.user", "user")
        .where("attendee.event.id = :eventId", { eventId: id });

      if (status) {
        queryBuilder.andWhere("attendee.registration_status = :status", { status });
      }

      const skip = (Number(page) - 1) * Number(limit);
      queryBuilder.skip(skip).take(Number(limit));
      queryBuilder.orderBy("attendee.registered_at", "DESC");

      const [attendees, total] = await queryBuilder.getManyAndCount();

      res.json({
        success: true,
        data: {
          attendees,
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
        message: "Failed to fetch attendees", 
        error: error.message 
      });
    }
  }

  static async updateAttendeeStatus(req: Request, res: Response) {
    try {
      const { id, userId } = req.params;
      const { status } = req.body;
      const organizerId = req.user.userId;

      const eventRepo = dbConnection.getRepository(Event);
      const attendeeRepo = dbConnection.getRepository(EventAttendee);

      const event = await eventRepo.findOne({
        where: { id },
        relations: ["organizer"],
      });

      if (!event) {
        return res.status(404).json({ 
          success: false, 
          message: "Event not found" 
        });
      }

      if (event.organizer.id !== organizerId) {
        return res.status(403).json({ 
          success: false, 
          message: "You can only manage attendees for events you organized" 
        });
      }

      const attendee = await attendeeRepo.findOne({
        where: { 
          event: { id }, 
          user: { id: userId } 
        },
        relations: ["user"],
      });

      if (!attendee) {
        return res.status(404).json({ 
          success: false, 
          message: "Attendee not found" 
        });
      }

      if (!["pending", "approved", "rejected", "cancelled"].includes(status)) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid status" 
        });
      }

      attendee.registration_status = status;
      await attendeeRepo.save(attendee);

      res.json({
        success: true,
        message: `Attendee status updated to ${status}`,
        data: { attendee },
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        message: "Failed to update attendee status", 
        error: error.message 
      });
    }
  }

  static async removeAttendee(req: Request, res: Response) {
    try {
      const { id, userId } = req.params;
      const organizerId = req.user.userId;

      const eventRepo = dbConnection.getRepository(Event);
      const attendeeRepo = dbConnection.getRepository(EventAttendee);

      const event = await eventRepo.findOne({
        where: { id },
        relations: ["organizer"],
      });

      if (!event) {
        return res.status(404).json({ 
          success: false, 
          message: "Event not found" 
        });
      }

      if (event.organizer.id !== organizerId) {
        return res.status(403).json({ 
          success: false, 
          message: "You can only remove attendees from events you organized" 
        });
      }

      const attendee = await attendeeRepo.findOne({
        where: { 
          event: { id }, 
          user: { id: userId } 
        },
      });

      if (!attendee) {
        return res.status(404).json({ 
          success: false, 
          message: "Attendee not found" 
        });
      }

      await attendeeRepo.remove(attendee);

      res.json({
        success: true,
        message: "Attendee removed successfully",
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        message: "Failed to remove attendee", 
        error: error.message 
      });
    }
  }

  static async getAllEventsForAdmin(req: Request, res: Response) {
  try {
    const { page = 1, limit = 1000, search, event_type, status, event_mode } = req.query;
    
    const eventRepo = dbConnection.getRepository(Event);
    
    const queryBuilder = eventRepo.createQueryBuilder("event")
      .leftJoinAndSelect("event.organizer", "organizer")
      .leftJoinAndSelect("organizer.profile", "profile")
      .leftJoinAndSelect("event.community", "community")
      .leftJoinAndSelect("event.attendees", "attendees")
      .select([
        "event",
        "organizer.id",
        "organizer.email",
        "organizer.first_name",
        "organizer.last_name",
        "organizer.profile_picture_url",
        "organizer.account_type",
        "profile",
        "community.id",
        "community.name",
        "community.slug",
        "attendees"
      ])
      .where("event.status != :deleted", { deleted: "Deleted" });

    if (search) {
      queryBuilder.andWhere(
        "(event.title ILIKE :search OR event.description ILIKE :search OR organizer.first_name ILIKE :search OR organizer.last_name ILIKE :search)",
        { search: `%${search}%` }
      );
    }

    if (event_type) {
      queryBuilder.andWhere("event.event_type = :event_type", { event_type });
    }

    if (status) {
      queryBuilder.andWhere("event.status = :status", { status });
    }

    if (event_mode) {
      queryBuilder.andWhere("event.event_mode = :event_mode", { event_mode });
    }

    const total = await queryBuilder.getCount();

    const skip = (Number(page) - 1) * Number(limit);
    queryBuilder.skip(skip).take(Number(limit));

    queryBuilder.orderBy("event.created_at", "DESC");

    const events = await queryBuilder.getMany();

    res.json({
      success: true,
      data: {
        events,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch events",
      error: error.message
    });
  }
}

static async activateDeactivateEvent(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    if (!status || !["Upcoming", "Cancelled"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Valid status required (Upcoming or Cancelled)"
      });
    }

    const eventRepo = dbConnection.getRepository(Event);
    const event = await eventRepo.findOne({
      where: { id },
      relations: ["organizer", "organizer.profile", "community"]
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    const oldStatus = event.status;
    event.status = status as EventStatus;
    await eventRepo.save(event);

    try {
      const isActivation = status === "Upcoming";
      const emailHtml = ActivateDeactivateCancelEventTemplate.getStatusChangeTemplate(
        event,
        isActivation,
        reason
      );

      const emailSubject = isActivation 
        ? `✅ Your Event "${event.title}" Has Been Activated`
        : `⚠️ Your Event "${event.title}" Has Been Cancelled`;

      await sendEmail({
        to: event.organizer.email,
        subject: emailSubject,
        html: emailHtml
      });

    } catch (emailError: any) {
    }

    const statusText = status === "Upcoming" ? 'activated' : 'cancelled';
    res.json({
      success: true,
      message: `Event ${statusText} successfully and notification sent`,
      data: {
        event: {
          id: event.id,
          title: event.title,
          status: event.status,
          organizer: {
            email: event.organizer.email,
            name: `${event.organizer.first_name} ${event.organizer.last_name}`
          }
        }
      }
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to update event status",
      error: error.message
    });
  }
}

static async cancelEventPermanently(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim().length < 20) {
      return res.status(400).json({
        success: false,
        message: "Please provide a detailed reason (at least 20 characters)"
      });
    }

    const eventRepo = dbConnection.getRepository(Event);
    const event = await eventRepo.findOne({
      where: { id },
      relations: ["organizer", "organizer.profile", "community", "attendees", "attendees.user"]
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    event.status = EventStatus.CANCELLED;
    await eventRepo.save(event);

    try {
      const emailHtml = ActivateDeactivateCancelEventTemplate.getCancellationTemplate(
        event,
        reason
      );

      await sendEmail({
        to: event.organizer.email,
        subject: `🚨 Your Event "${event.title}" Has Been Cancelled`,
        html: emailHtml
      });

    } catch (emailError: any) {
    }

    res.json({
      success: true,
      message: "Event cancelled successfully and notification sent",
      data: {
        event: {
          id: event.id,
          title: event.title,
          status: event.status,
          organizer: {
            email: event.organizer.email,
            name: `${event.organizer.first_name} ${event.organizer.last_name}`
          }
        }
      }
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to cancel event",
      error: error.message
    });
  }
}

static async getLatestUpcomingEvents(req: Request, res: Response) {
  try {
    const eventRepo = dbConnection.getRepository(Event);
    
    const debugQuery = await eventRepo.createQueryBuilder("event")
      .select([
        "event.id",
        "event.title", 
        "event.status",
        "event.start_datetime",
        "event.end_datetime"
      ])
      .orderBy("event.created_at", "DESC")
      .take(10)
      .getMany();
    
    const queryBuilder = eventRepo.createQueryBuilder("event")
      .leftJoinAndSelect("event.organizer", "organizer")
      .leftJoinAndSelect("organizer.profile", "profile")
      .leftJoinAndSelect("event.community", "community")
      .leftJoinAndSelect("event.attendees", "attendees")
      .select([
        "event",
        "organizer.id",
        "organizer.email",
        "organizer.first_name",
        "organizer.last_name",
        "organizer.profile_picture_url",
        "organizer.account_type",
        "profile.id",
        "profile.institution_name",
        "profile.department",
        "profile.academic_level",
        "profile.research_interests",
        "community.id",
        "community.name",
        "community.slug",
        "attendees"
      ])
      .where("event.status = :status", { status: EventStatus.UPCOMING })
      .andWhere("event.end_datetime > :now", { now: new Date() })
      .orderBy("event.start_datetime", "ASC")
      .take(3);

    const events = await queryBuilder.getMany();

    res.json({
      success: true,
      data: {
        events
      }
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch upcoming events",
      error: error.message
    });
  }
}

static async updateEventStatuses(req: Request, res: Response) {
  try {
    const eventRepo = dbConnection.getRepository(Event);
    const now = new Date();
    
    const allEvents = await eventRepo.find();
    let updated = 0;
    
    for (const event of allEvents) {
      const startDate = new Date(event.start_datetime);
      const endDate = new Date(event.end_datetime);
      
      let newStatus = event.status;
      
      if (event.status === EventStatus.CANCELLED || event.status === EventStatus.DELETED) {
        continue;
      }
      
      if (endDate < now) {
        newStatus = EventStatus.COMPLETED;
      } else if (startDate <= now && endDate > now) {
        newStatus = EventStatus.ONGOING;
      } else if (startDate > now) {
        newStatus = EventStatus.UPCOMING;
      }
      
      if (newStatus !== event.status) {
        event.status = newStatus;
        await eventRepo.save(event);
        updated++;
      }
    }
    
    res.json({
      success: true,
      message: `Updated ${updated} event statuses`,
      data: { updated }
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to update event statuses",
      error: error.message
    });
  }
}

static async extendEventDate(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { start_datetime, end_datetime, reason } = req.body;

      if (!start_datetime || !end_datetime || !reason) {
        return res.status(400).json({
          success: false,
          message: "All fields are required: start_datetime, end_datetime, reason"
        });
      }

      if (reason.length < 20) {
        return res.status(400).json({
          success: false,
          message: "Reason must be at least 20 characters long"
        });
      }

      const eventRepo = dbConnection.getRepository(Event);
      const event = await eventRepo.findOne({
        where: { id },
        relations: ["organizer", "attendees", "attendees.user"]
      });

      if (!event) {
        return res.status(404).json({
          success: false,
          message: "Event not found"
        });
      }

      const newStart = new Date(start_datetime);
      const newEnd = new Date(end_datetime);
      const currentStart = new Date(event.start_datetime);
      const currentEnd = new Date(event.end_datetime);

      if (newStart < currentStart || newEnd < currentEnd) {
        return res.status(400).json({
          success: false,
          message: "New dates must be after current dates"
        });
      }

      event.start_datetime = newStart;
      event.end_datetime = newEnd;
      await eventRepo.save(event);

      try {
        const organizerEmail = AdminEventManagementTemplates.getDateExtendedTemplate(
          event,
          { start_datetime: newStart, end_datetime: newEnd, reason },
          'organizer'
        );
        
        await sendEmail({
          to: event.organizer.email,
          subject: `📅 Event Date Extended: ${event.title}`,
          html: organizerEmail
        });

        if (event.attendees && event.attendees.length > 0) {
          const attendeeEmails = event.attendees
            .filter(attendee => attendee.registration_status === RegistrationStatus.APPROVED)
            .map(attendee => attendee.user.email);

          const attendeeEmailHtml = AdminEventManagementTemplates.getDateExtendedTemplate(
            event,
            { start_datetime: newStart, end_datetime: newEnd, reason },
            'attendee'
          );

          for (const email of attendeeEmails) {
            await sendEmail({
              to: email,
              subject: `📅 Event Date Changed: ${event.title}`,
              html: attendeeEmailHtml
            });
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      } catch (emailError) {
      }

      res.json({
        success: true,
        message: "Event date extended successfully and notifications sent",
        data: { event }
      });

    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to extend event date",
        error: error.message
      });
    }
  }

  static async closeEvent(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { reason, send_certificates = false } = req.body;

      if (!reason || reason.length < 20) {
        return res.status(400).json({
          success: false,
          message: "Reason is required and must be at least 20 characters long"
        });
      }

      const eventRepo = dbConnection.getRepository(Event);
      const attendeeRepo = dbConnection.getRepository(EventAttendee);

      const event = await eventRepo.findOne({
        where: { id },
        relations: ["organizer", "attendees", "attendees.user"]
      });

      if (!event) {
        return res.status(404).json({
          success: false,
          message: "Event not found"
        });
      }

      event.status = EventStatus.COMPLETED;
      await eventRepo.save(event);

      if (send_certificates && event.attendees) {
        for (const attendee of event.attendees) {
          if (attendee.registration_status === RegistrationStatus.APPROVED) {
            attendee.registration_status = RegistrationStatus.ATTENDED;
            attendee.certificate_issued = true;
            await attendeeRepo.save(attendee);
          }
        }
      }

      try {
        const emailHtml = AdminEventManagementTemplates.getEventClosedTemplate(
          event,
          { reason, send_certificates }
        );

        await sendEmail({
          to: event.organizer.email,
          subject: `✅ Event Closed: ${event.title}`,
          html: emailHtml
        });
      } catch (emailError) {
      }

      res.json({
        success: true,
        message: "Event closed successfully and organizer notified",
        data: { event }
      });

    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to close event",
        error: error.message
      });
    }
  }

  static async postponeEvent(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { new_start_datetime, new_end_datetime, reason } = req.body;

      if (!new_start_datetime || !new_end_datetime || !reason) {
        return res.status(400).json({
          success: false,
          message: "All fields are required: new_start_datetime, new_end_datetime, reason"
        });
      }

      if (reason.length < 30) {
        return res.status(400).json({
          success: false,
          message: "Reason must be at least 30 characters long"
        });
      }

      const newStart = new Date(new_start_datetime);
      const newEnd = new Date(new_end_datetime);
      const now = new Date();

      if (newStart <= now) {
        return res.status(400).json({
          success: false,
          message: "New start date must be in the future"
        });
      }

      const eventRepo = dbConnection.getRepository(Event);
      const event = await eventRepo.findOne({
        where: { id },
        relations: ["organizer", "attendees", "attendees.user"]
      });

      if (!event) {
        return res.status(404).json({
          success: false,
          message: "Event not found"
        });
      }

      const oldDates = {
        start_datetime: event.start_datetime,
        end_datetime: event.end_datetime
      };

      event.start_datetime = newStart;
      event.end_datetime = newEnd;
      await eventRepo.save(event);

      try {
      const organizerEmail = AdminEventManagementTemplates.getEventPostponedTemplate(
        event, 
        { 
          oldDates: { 
            start_datetime: oldDates.start_datetime, 
            end_datetime: oldDates.end_datetime    
          }, 
          newDates: { 
            start_datetime: newStart, 
            end_datetime: newEnd 
          }, 
          reason 
        },
        'organizer'
      );
        
        await sendEmail({
          to: event.organizer.email,
          subject: `📅 Event Postponed: ${event.title}`,
          html: organizerEmail
        });

        if (event.attendees && event.attendees.length > 0) {
          const attendeeEmails = event.attendees
            .filter(attendee => 
              attendee.registration_status === RegistrationStatus.APPROVED || 
              attendee.registration_status === RegistrationStatus.REGISTERED
            )
            .map(attendee => attendee.user.email);

          const attendeeEmailHtml = AdminEventManagementTemplates.getEventPostponedTemplate(
            event,
            { oldDates, newDates: { start_datetime: newStart, end_datetime: newEnd }, reason },
            'attendee'
          );

          for (const email of attendeeEmails) {
            await sendEmail({
              to: email,
              subject: `📅 Event Postponed: ${event.title}`,
              html: attendeeEmailHtml
            });
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      } catch (emailError) {
      }

      res.json({
        success: true,
        message: "Event postponed successfully and notifications sent",
        data: { event }
      });

    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to postpone event",
        error: error.message
      });
    }
  }

  static async transferOwnership(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { new_organizer_id, reason } = req.body;

      if (!new_organizer_id || !reason) {
        return res.status(400).json({
          success: false,
          message: "All fields are required: new_organizer_id, reason"
        });
      }

      if (reason.length < 20) {
        return res.status(400).json({
          success: false,
          message: "Reason must be at least 20 characters long"
        });
      }

      const eventRepo = dbConnection.getRepository(Event);
      const userRepo = dbConnection.getRepository(User);

      const event = await eventRepo.findOne({
        where: { id },
        relations: ["organizer"]
      });

      if (!event) {
        return res.status(404).json({
          success: false,
          message: "Event not found"
        });
      }

      const newOrganizer = await userRepo.findOne({
        where: { id: new_organizer_id }
      });

      if (!newOrganizer) {
        return res.status(404).json({
          success: false,
          message: "New organizer not found"
        });
      }

      const oldOrganizer = event.organizer;

      event.organizer = newOrganizer;
      await eventRepo.save(event);

      try {
        const oldOrganizerEmail = AdminEventManagementTemplates.getOwnershipTransferredTemplate(
          event,
          { oldOrganizer, newOrganizer, reason },
          'old_organizer'
        );
        
        await sendEmail({
          to: oldOrganizer.email,
          subject: `🔄 Event Ownership Transferred: ${event.title}`,
          html: oldOrganizerEmail
        });

        const newOrganizerEmail = AdminEventManagementTemplates.getOwnershipTransferredTemplate(
          event,
          { oldOrganizer, newOrganizer, reason },
          'new_organizer'
        );
        
        await sendEmail({
          to: newOrganizer.email,
          subject: `🎉 You're Now the Organizer: ${event.title}`,
          html: newOrganizerEmail
        });
      } catch (emailError) {
      }

      res.json({
        success: true,
        message: "Event ownership transferred successfully and notifications sent",
        data: { event }
      });

    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to transfer event ownership",
        error: error.message
      });
    }
  }

  static async bulkAttendeeAction(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { user_ids, action, reason } = req.body;

      if (!user_ids || !Array.isArray(user_ids) || !action) {
        return res.status(400).json({
          success: false,
          message: "user_ids array and action are required"
        });
      }

      if (!['approve', 'reject'].includes(action)) {
        return res.status(400).json({
          success: false,
          message: "Action must be either 'approve' or 'reject'"
        });
      }

      const eventRepo = dbConnection.getRepository(Event);
      const attendeeRepo = dbConnection.getRepository(EventAttendee);

      const event = await eventRepo.findOne({
        where: { id },
        relations: ["organizer"]
      });

      if (!event) {
        return res.status(404).json({
          success: false,
          message: "Event not found"
        });
      }

      const results = {
        processed: 0,
        succeeded: 0,
        failed: 0,
        details: [] as Array<{ user_id: string; status: string; error?: string }>
      };

      for (const userId of user_ids) {
        try {
          const attendee = await attendeeRepo.findOne({
            where: { 
              event: { id }, 
              user: { id: userId } 
            },
            relations: ["user"]
          });

          if (!attendee) {
            results.details.push({
              user_id: userId,
              status: 'failed',
              error: 'Attendee not found'
            });
            results.failed++;
            continue;
          }

          attendee.registration_status = action === 'approve' 
            ? RegistrationStatus.APPROVED 
            : RegistrationStatus.REJECTED;
          
          await attendeeRepo.save(attendee);
          results.succeeded++;
          results.details.push({
            user_id: userId,
            status: 'succeeded'
          });

          try {
            const emailHtml = AdminEventManagementTemplates.getBulkActionTemplate(
              event,
              { action, reason, user: attendee.user }
            );

            await sendEmail({
              to: attendee.user.email,
              subject: `📧 Event Registration ${action === 'approve' ? 'Approved' : 'Rejected'}: ${event.title}`,
              html: emailHtml
            });
          } catch (emailError) {
          }

        } catch (error: any) {
          results.failed++;
          results.details.push({
            user_id: userId,
            status: 'failed',
            error: error.message
          });
        }
        results.processed++;
      }

      res.json({
        success: true,
        message: `Bulk action completed: ${results.succeeded} succeeded, ${results.failed} failed`,
        data: results
      });

    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to process bulk attendee action",
        error: error.message
      });
    }
  }

  static async exportAttendees(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status, format = 'csv' } = req.query;

      const eventRepo = dbConnection.getRepository(Event);
      const attendeeRepo = dbConnection.getRepository(EventAttendee);

      const event = await eventRepo.findOne({
        where: { id }
      });

      if (!event) {
        return res.status(404).json({
          success: false,
          message: "Event not found"
        });
      }

      const queryBuilder = attendeeRepo.createQueryBuilder("attendee")
        .leftJoinAndSelect("attendee.user", "user")
        .where("attendee.event.id = :eventId", { eventId: id });

      if (status && status !== 'all') {
        queryBuilder.andWhere("attendee.registration_status = :status", { status });
      }

      const attendees = await queryBuilder.getMany();

      if (format === 'csv') {
        const headers = ['Name', 'Email', 'Registration Date', 'Status', 'Check-in Time'];
        const csvData = attendees.map(attendee => [
          `${attendee.user.first_name} ${attendee.user.last_name}`,
          attendee.user.email,
          new Date(attendee.registered_at).toLocaleDateString(),
          attendee.registration_status,
          attendee.check_in_time ? new Date(attendee.check_in_time).toLocaleString() : 'Not checked in'
        ]);

        const csvContent = [
          headers.join(','),
          ...csvData.map(row => row.map(field => `"${field}"`).join(','))
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="attendees-${event.title}-${new Date().toISOString().split('T')[0]}.csv"`);
        return res.send(csvContent);
      }

      res.json({
        success: true,
        data: { attendees }
      });

    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to export attendees",
        error: error.message
      });
    }
  }

  static async getEventStatistics(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const eventRepo = dbConnection.getRepository(Event);
      const attendeeRepo = dbConnection.getRepository(EventAttendee);

      const event = await eventRepo.findOne({
        where: { id },
        relations: ["attendees", "attendees.user"]
      });

      if (!event) {
        return res.status(404).json({
          success: false,
          message: "Event not found"
        });
      }

      const totalRegistrations = event.attendees?.length || 0;
      const statusCounts = {
        pending: event.attendees?.filter(a => a.registration_status === RegistrationStatus.REGISTERED).length || 0,
        approved: event.attendees?.filter(a => a.registration_status === RegistrationStatus.APPROVED).length || 0,
        rejected: event.attendees?.filter(a => a.registration_status === RegistrationStatus.REJECTED).length || 0,
        attended: event.attendees?.filter(a => a.registration_status === RegistrationStatus.ATTENDED).length || 0,
        waitlisted: event.attendees?.filter(a => a.registration_status === RegistrationStatus.WAITLISTED).length || 0
      };

      const approvalRate = totalRegistrations > 0 
        ? (statusCounts.approved / totalRegistrations) * 100 
        : 0;

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const timelineData = await attendeeRepo
        .createQueryBuilder("attendee")
        .select("DATE(attendee.registered_at)", "date")
        .addSelect("COUNT(*)", "count")
        .where("attendee.event.id = :eventId", { eventId: id })
        .andWhere("attendee.registered_at >= :sevenDaysAgo", { sevenDaysAgo })
        .groupBy("DATE(attendee.registered_at)")
        .orderBy("date", "ASC")
        .getRawMany();

      const statistics = {
        totalRegistrations,
        statusCounts,
        approvalRate: Math.round(approvalRate * 100) / 100,
        attendanceRate: totalRegistrations > 0 
          ? Math.round((statusCounts.attended / totalRegistrations) * 100 * 100) / 100 
          : 0,
        capacity: event.max_attendees 
          ? Math.round((totalRegistrations / event.max_attendees) * 100 * 100) / 100 
          : null,
        registrationTimeline: timelineData,
        recentActivity: event.attendees?.slice(0, 10).map(attendee => ({
          user: `${attendee.user.first_name} ${attendee.user.last_name}`,
          action: 'registered',
          timestamp: attendee.registered_at,
          status: attendee.registration_status
        })) || []
      };

      res.json({
        success: true,
        data: { statistics }
      });

    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch event statistics",
        error: error.message
      });
    }
  }

  static async duplicateEvent(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { new_title, new_start_datetime, new_end_datetime } = req.body;
      const userId = req.user.userId;

      if (!new_title || !new_start_datetime || !new_end_datetime) {
        return res.status(400).json({
          success: false,
          message: "All fields are required: new_title, new_start_datetime, new_end_datetime"
        });
      }

      const eventRepo = dbConnection.getRepository(Event);
      const originalEvent = await eventRepo.findOne({
        where: { id },
        relations: ["agenda_items", "linked_projects"]
      });

      if (!originalEvent) {
        return res.status(404).json({
          success: false,
          message: "Original event not found"
        });
      }

      const newEvent = eventRepo.create({
        title: new_title,
        description: originalEvent.description,
        event_type: originalEvent.event_type,
        event_mode: originalEvent.event_mode,
        start_datetime: new Date(new_start_datetime),
        end_datetime: new Date(new_end_datetime),
        timezone: originalEvent.timezone,
        location_address: originalEvent.location_address,
        online_meeting_url: originalEvent.online_meeting_url,
        cover_image_url: originalEvent.cover_image_url,
        max_attendees: originalEvent.max_attendees,
        is_free: originalEvent.is_free,
        price_amount: originalEvent.price_amount,
        requires_approval: originalEvent.requires_approval,
        status: EventStatus.UPCOMING,
        organizer: { id: userId },
        community: originalEvent.community,
        agenda_items: originalEvent.agenda_items?.map(agenda => ({
          session_title: agenda.session_title,
          description: agenda.description,
          speaker_name: agenda.speaker_name,
          start_time: agenda.start_time,
          end_time: agenda.end_time,
          session_type: agenda.session_type,
          display_order: agenda.display_order
        })) || [],
        linked_projects: originalEvent.linked_projects || []
      });

      await eventRepo.save(newEvent);

      res.json({
        success: true,
        message: "Event duplicated successfully",
        data: { event: newEvent }
      });

    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to duplicate event",
        error: error.message
      });
    }
  }
}