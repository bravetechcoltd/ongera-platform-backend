"use strict";
// @ts-nocheck
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventController = void 0;
const db_1 = __importDefault(require("../database/db"));
const Event_1 = require("../database/models/Event");
const EventAttendee_1 = require("../database/models/EventAttendee");
const EventAgenda_1 = require("../database/models/EventAgenda");
const cloud_1 = require("../helpers/cloud");
const utils_1 = require("../helpers/utils");
const NewsEventCreatedTemplate_1 = require("../helpers/NewsEventCreatedTemplate");
const ActivateDeactivateCancelEventTemplate_1 = require("../helpers/ActivateDeactivateCancelEventTemplate");
const Community_1 = require("../database/models/Community");
const User_1 = require("../database/models/User");
const SubscribeController_1 = require("./SubscribeController");
const AdminEventManagementTemplates_1 = require("../helpers/AdminEventManagementTemplates");
class EventController {
    static async createCommunityEvent(req, res) {
        var _a, _b, _c, _d;
        try {
            const { community_id } = req.params;
            const userId = req.user.userId;
            const { title, description, event_type, event_mode, start_datetime, end_datetime, timezone, location_address, online_meeting_url, max_attendees, is_free, price_amount, requires_approval, linked_project_ids } = req.body;
            console.log("🔍 ========== CREATE COMMUNITY EVENT DEBUG START ==========");
            console.log("📥 Request Data:", {
                community_id,
                userId,
                title,
                event_type,
                event_mode,
                start_datetime,
                end_datetime
            });
            // Step 1: Verify community exists and get members
            console.log("📍 STEP 1: Verifying community and membership...");
            const communityRepo = db_1.default.getRepository(Community_1.Community);
            const community = await communityRepo.findOne({
                where: { id: community_id },
                relations: ["members", "creator", "members.profile"]
            });
            console.log("✅ Community verification:", {
                found: !!community,
                name: community === null || community === void 0 ? void 0 : community.name,
                creatorId: (_a = community === null || community === void 0 ? void 0 : community.creator) === null || _a === void 0 ? void 0 : _a.id,
                memberCount: (_b = community === null || community === void 0 ? void 0 : community.members) === null || _b === void 0 ? void 0 : _b.length
            });
            if (!community) {
                console.log("❌ Community not found");
                return res.status(404).json({
                    success: false,
                    message: "Community not found"
                });
            }
            // Step 2: Check membership
            console.log("📍 STEP 2: Checking user membership...");
            const isMember = ((_c = community.members) === null || _c === void 0 ? void 0 : _c.some(m => m.id === userId)) ||
                community.creator.id === userId;
            console.log("✅ Membership check:", {
                userId,
                isMember,
                isCreator: community.creator.id === userId
            });
            if (!isMember) {
                console.log("❌ User is not a community member");
                return res.status(403).json({
                    success: false,
                    message: "Only community members can create events"
                });
            }
            // Step 3: Create event
            console.log("📍 STEP 3: Creating event...");
            const eventRepo = db_1.default.getRepository(Event_1.Event);
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
            console.log("✅ Event object created:", {
                title: event.title,
                event_type: event.event_type,
                event_mode: event.event_mode,
                is_free: event.is_free
            });
            // Step 4: Handle cover image upload
            if (req.file) {
                console.log("📍 STEP 4: Uploading cover image...");
                const uploadResult = await (0, cloud_1.UploadToCloud)(req.file);
                event.cover_image_url = uploadResult.secure_url;
                console.log("✅ Cover image uploaded:", uploadResult.secure_url);
            }
            // Step 5: Save event
            console.log("📍 STEP 5: Saving event to database...");
            await eventRepo.save(event);
            console.log("✅ Event saved with ID:", event.id);
            // Step 6: Link projects if provided
            if (linked_project_ids && Array.isArray(linked_project_ids)) {
                console.log("📍 STEP 6: Linking projects...");
                event.linked_projects = linked_project_ids.map(id => ({ id }));
                await eventRepo.save(event);
                console.log("✅ Projects linked:", linked_project_ids.length);
            }
            // Step 7: Fetch complete event with all relations
            console.log("📍 STEP 7: Fetching complete event with relations...");
            const completeEvent = await eventRepo.findOne({
                where: { id: event.id },
                relations: ["organizer", "organizer.profile", "community"]
            });
            console.log("✅ Complete event fetched:", {
                id: completeEvent === null || completeEvent === void 0 ? void 0 : completeEvent.id,
                hasCommunity: !!(completeEvent === null || completeEvent === void 0 ? void 0 : completeEvent.community),
                communityName: (_d = completeEvent === null || completeEvent === void 0 ? void 0 : completeEvent.community) === null || _d === void 0 ? void 0 : _d.name,
                hasOrganizer: !!(completeEvent === null || completeEvent === void 0 ? void 0 : completeEvent.organizer)
            });
            // ========== EMAIL NOTIFICATION SECTION ==========
            console.log("\n📧 ========== EMAIL NOTIFICATION START ==========");
            console.log("📍 STEP 8: Sending email notifications to community members...");
            try {
                // Filter members (exclude event organizer)
                const membersToNotify = community.members.filter(member => member.id !== userId);
                console.log("📊 Email Distribution Plan:", {
                    totalMembers: community.members.length,
                    membersToNotify: membersToNotify.length,
                    organizerExcluded: userId
                });
                if (membersToNotify.length === 0) {
                    console.log("⚠️ No members to notify (community only has creator)");
                }
                else {
                    let emailsSent = 0;
                    let emailsFailed = 0;
                    const failedEmails = [];
                    for (let i = 0; i < membersToNotify.length; i++) {
                        const member = membersToNotify[i];
                        const progress = `[${i + 1}/${membersToNotify.length}]`;
                        try {
                            console.log(`\n${progress} 📧 Preparing email for: ${member.email}`);
                            console.log(`   Name: ${member.first_name} ${member.last_name}`);
                            // Prepare event data for email template
                            const eventData = {
                                title: completeEvent.title,
                                description: completeEvent.description,
                                event_type: completeEvent.event_type,
                                event_mode: completeEvent.event_mode,
                                start_datetime: completeEvent.start_datetime,
                                end_datetime: completeEvent.end_datetime,
                                timezone: completeEvent.timezone,
                                location_address: completeEvent.location_address,
                                online_meeting_url: completeEvent.online_meeting_url,
                                cover_image_url: completeEvent.cover_image_url,
                                is_free: completeEvent.is_free,
                                price_amount: completeEvent.price_amount,
                                max_attendees: completeEvent.max_attendees,
                                requires_approval: completeEvent.requires_approval,
                                organizer: {
                                    first_name: completeEvent.organizer.first_name,
                                    last_name: completeEvent.organizer.last_name,
                                    profile: completeEvent.organizer.profile
                                },
                                community: {
                                    name: completeEvent.community.name,
                                    member_count: completeEvent.community.member_count
                                },
                                event_id: completeEvent.id
                            };
                            const memberData = {
                                first_name: member.first_name
                            };
                            // Generate email HTML
                            const emailHtml = NewsEventCreatedTemplate_1.NewsEventCreatedTemplate.getEventCreatedTemplate(eventData, memberData);
                            console.log(`   ✉️ Email HTML generated (${emailHtml.length} chars)`);
                            console.log(`   📬 Sending email via sendEmail function...`);
                            // Send email
                            await (0, utils_1.sendEmail)({
                                to: member.email,
                                subject: `📅 New Event: ${completeEvent.title}`,
                                html: emailHtml
                            });
                            emailsSent++;
                            console.log(`   ✅ SUCCESS: Email sent to ${member.email}`);
                            // Small delay to avoid rate limiting
                            await new Promise(resolve => setTimeout(resolve, 100));
                        }
                        catch (emailError) {
                            emailsFailed++;
                            const errorMsg = emailError.message || 'Unknown error';
                            console.error(`   ❌ FAILED: ${member.email}`);
                            console.error(`   Error: ${errorMsg}`);
                            failedEmails.push({
                                email: member.email,
                                error: errorMsg
                            });
                        }
                    }
                    // Email distribution summary
                    console.log("\n📊 === EMAIL DISTRIBUTION SUMMARY ===");
                    console.log(`✅ Successfully sent: ${emailsSent}/${membersToNotify.length}`);
                    console.log(`❌ Failed: ${emailsFailed}/${membersToNotify.length}`);
                    console.log(`📧 Success rate: ${((emailsSent / membersToNotify.length) * 100).toFixed(1)}%`);
                    if (failedEmails.length > 0) {
                        console.log("\n❌ Failed emails:");
                        failedEmails.forEach((fail, idx) => {
                            console.log(`  ${idx + 1}. ${fail.email} - ${fail.error}`);
                        });
                    }
                }
            }
            catch (emailSystemError) {
                console.error("❌ Email system error:", emailSystemError.message);
                console.error("⚠️ Event was created successfully, but email notifications failed");
                // Don't throw error - event creation succeeded
            }
            console.log("📧 ========== EMAIL NOTIFICATION END ==========\n");
            // ========== END EMAIL NOTIFICATION SECTION ==========
            // ==================== NOTIFY SUBSCRIBERS ====================
            // ✅ NEW SECTION - Send notifications to platform subscribers
            try {
                console.log("📧 ========== NOTIFYING PLATFORM SUBSCRIBERS ==========");
                const subscriberNotificationData = {
                    title: completeEvent.title,
                    description: completeEvent.description,
                    event_type: completeEvent.event_type,
                    event_mode: completeEvent.event_mode,
                    start_datetime: completeEvent.start_datetime,
                    end_datetime: completeEvent.end_datetime,
                    timezone: completeEvent.timezone,
                    location_address: completeEvent.location_address,
                    online_meeting_url: completeEvent.online_meeting_url,
                    organizer: {
                        first_name: completeEvent.organizer.first_name,
                        last_name: completeEvent.organizer.last_name
                    },
                    community: {
                        name: completeEvent.community.name
                    },
                    event_id: completeEvent.id,
                    created_at: completeEvent.created_at
                };
                // Call the subscriber notification method (non-blocking)
                SubscribeController_1.SubscribeController.notifyNewEvent(subscriberNotificationData)
                    .catch(err => {
                    console.error("❌ Subscriber notification failed:", err.message);
                });
                console.log("✅ Subscriber notification process initiated");
                console.log("📧 ========== SUBSCRIBER NOTIFICATION INITIATED ==========\n");
            }
            catch (subscriberError) {
                console.error("❌ Subscriber notification error:", subscriberError.message);
                // Don't fail the request if subscriber notification fails
            }
            // ==================== END SUBSCRIBER NOTIFICATION ====================
            console.log("🔍 ========== CREATE COMMUNITY EVENT DEBUG END ==========\n");
            res.status(201).json({
                success: true,
                message: "Community event created successfully and notifications sent",
                data: { event: completeEvent },
            });
        }
        catch (error) {
            console.error("❌ ========== ERROR IN CREATE COMMUNITY EVENT ==========");
            console.error("Error details:", {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            console.error("========================================================\n");
            res.status(500).json({
                success: false,
                message: "Failed to create community event",
                error: error.message
            });
        }
    }
    // ✅ NEW: Fetch Events for Specific Community
    static async getCommunityEvents(req, res) {
        try {
            const { community_id } = req.params;
            const { page = 1, limit = 10, status, event_type } = req.query;
            const eventRepo = db_1.default.getRepository(Event_1.Event);
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
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: "Failed to fetch community events",
                error: error.message
            });
        }
    }
    // Keep all existing methods...
    static async createEvent(req, res) {
        try {
            const userId = req.user.userId;
            const { title, description, event_type, event_mode, start_datetime, end_datetime, timezone, location_address, online_meeting_url, max_attendees, is_free, price_amount, requires_approval, community_id, linked_project_ids } = req.body;
            const eventRepo = db_1.default.getRepository(Event_1.Event);
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
                const uploadResult = await (0, cloud_1.UploadToCloud)(req.file);
                event.cover_image_url = uploadResult.secure_url;
            }
            await eventRepo.save(event);
            if (linked_project_ids && Array.isArray(linked_project_ids)) {
                event.linked_projects = linked_project_ids.map(id => ({ id }));
                await eventRepo.save(event);
            }
            res.status(201).json({
                success: true,
                message: "Event created successfully",
                data: { event },
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: "Failed to create event",
                error: error.message
            });
        }
    }
    static async getAllEvents(req, res) {
        try {
            const { page = 1, limit = 10, search, event_type, status, event_mode } = req.query;
            const eventRepo = db_1.default.getRepository(Event_1.Event);
            const queryBuilder = eventRepo.createQueryBuilder("event")
                .leftJoinAndSelect("event.organizer", "organizer")
                .leftJoinAndSelect("event.community", "community")
                .leftJoinAndSelect("event.attendees", "attendees")
                .leftJoinAndSelect("attendees.user", "attendeeUser")
                .leftJoinAndSelect("event.agenda_items", "agenda_items")
                .where("event.status != :cancelled", { cancelled: "Cancelled" });
            if (search) {
                queryBuilder.andWhere("(event.title ILIKE :search OR event.description ILIKE :search)", { search: `%${search}%` });
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
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: "Failed to fetch events",
                error: error.message
            });
        }
    }
    // NEW: Get My Events (events user is attending or organizing)
    static async getMyEvents(req, res) {
        try {
            const userId = req.user.userId;
            const { page = 1, limit = 10, type = 'attending' } = req.query;
            const eventRepo = db_1.default.getRepository(Event_1.Event);
            const attendeeRepo = db_1.default.getRepository(EventAttendee_1.EventAttendee);
            let events;
            let total;
            if (type === 'organizing') {
                // Events user is organizing
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
            }
            else {
                // Events user is attending
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
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: "Failed to fetch your events",
                error: error.message
            });
        }
    }
    // NEW: Get single event by ID
    static async getEventById(req, res) {
        try {
            const { id } = req.params;
            const eventRepo = db_1.default.getRepository(Event_1.Event);
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
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: "Failed to fetch event",
                error: error.message
            });
        }
    }
    // NEW: Update event
    static async updateEvent(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.userId;
            const updateData = req.body;
            const eventRepo = db_1.default.getRepository(Event_1.Event);
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
            // Check if user is the organizer
            if (event.organizer.id !== userId) {
                return res.status(403).json({
                    success: false,
                    message: "You can only update events you organized"
                });
            }
            // Update fields
            if (updateData.title)
                event.title = updateData.title;
            if (updateData.description)
                event.description = updateData.description;
            if (updateData.event_type)
                event.event_type = updateData.event_type;
            if (updateData.event_mode)
                event.event_mode = updateData.event_mode;
            if (updateData.start_datetime)
                event.start_datetime = new Date(updateData.start_datetime);
            if (updateData.end_datetime)
                event.end_datetime = new Date(updateData.end_datetime);
            if (updateData.timezone)
                event.timezone = updateData.timezone;
            if (updateData.location_address !== undefined)
                event.location_address = updateData.location_address;
            if (updateData.online_meeting_url !== undefined)
                event.online_meeting_url = updateData.online_meeting_url;
            if (updateData.max_attendees !== undefined)
                event.max_attendees = updateData.max_attendees ? parseInt(updateData.max_attendees) : null;
            if (updateData.is_free !== undefined)
                event.is_free = updateData.is_free === 'true' || updateData.is_free === true;
            if (updateData.price_amount !== undefined)
                event.price_amount = updateData.price_amount ? parseFloat(updateData.price_amount) : null;
            if (updateData.requires_approval !== undefined)
                event.requires_approval = updateData.requires_approval === 'true' || updateData.requires_approval === true;
            if (updateData.status)
                event.status = updateData.status;
            // Handle cover image update
            if (req.file) {
                const uploadResult = await (0, cloud_1.UploadToCloud)(req.file);
                event.cover_image_url = uploadResult.secure_url;
            }
            // Handle linked projects
            if (updateData.linked_project_ids) {
                const projectIds = Array.isArray(updateData.linked_project_ids)
                    ? updateData.linked_project_ids
                    : JSON.parse(updateData.linked_project_ids);
                event.linked_projects = projectIds.map((projectId) => ({ id: projectId }));
            }
            await eventRepo.save(event);
            res.json({
                success: true,
                message: "Event updated successfully",
                data: { event },
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: "Failed to update event",
                error: error.message
            });
        }
    }
    static async deleteEvent(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.userId;
            const eventRepo = db_1.default.getRepository(Event_1.Event);
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
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: "Failed to delete event",
                error: error.message
            });
        }
    }
    static async registerForEvent(req, res) {
        var _a, _b, _c;
        // === DEBUG 1: Log incoming request ===
        console.log("🔍 [DEBUG] POST /api/events/:id/register - Request Received");
        console.log("   Request Params:", req.params);
        console.log("   Authenticated User ID:", (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId);
        console.log("   Request Body (Raw):", req.body);
        console.log("   Request Body Keys:", Object.keys(req.body || {}));
        try {
            const { id } = req.params;
            const userId = req.user.userId;
            // === VALIDATION 1: Check authentication ===
            if (!userId) {
                console.log("❌ [DEBUG] User not authenticated");
                return res.status(401).json({
                    success: false,
                    message: "Authentication required"
                });
            }
            // === VALIDATION 2: Extract and validate request body data ===
            const attendeeData = {
                event_id: id,
                user_id: userId,
                // Optional fields from request body
                additional_notes: req.body.additional_notes || null,
                dietary_requirements: req.body.dietary_requirements || null,
                special_accommodations: req.body.special_accommodations || null,
            };
            console.log("🔍 [DEBUG] Prepared Attendee Data:");
            console.log("   Event ID:", attendeeData.event_id);
            console.log("   User ID:", attendeeData.user_id);
            console.log("   Additional Notes:", attendeeData.additional_notes);
            console.log("   Dietary Requirements:", attendeeData.dietary_requirements);
            console.log("   Special Accommodations:", attendeeData.special_accommodations);
            // === VALIDATION 3: Verify all required data is present ===
            if (!attendeeData.event_id) {
                console.log("❌ [DEBUG] Event ID is missing");
                return res.status(400).json({
                    success: false,
                    message: "Event ID is required"
                });
            }
            if (!attendeeData.user_id) {
                console.log("❌ [DEBUG] User ID is missing");
                return res.status(400).json({
                    success: false,
                    message: "User ID is required"
                });
            }
            console.log("✅ [DEBUG] Request body validation passed");
            console.log("🔍 [DEBUG] Attempting to find event with ID:", id);
            const eventRepo = db_1.default.getRepository(Event_1.Event);
            const attendeeRepo = db_1.default.getRepository(EventAttendee_1.EventAttendee);
            const event = await eventRepo.findOne({
                where: { id },
                relations: ["attendees"],
            });
            // === DEBUG: Log event lookup result ===
            console.log("🔍 [DEBUG] Event Lookup Result:");
            console.log("   Event Found:", !!event);
            if (event) {
                console.log("   Event Title:", event.title);
                console.log("   Event Status:", event.status);
                console.log("   Requires Approval:", event.requires_approval);
                console.log("   Current Attendee Count:", (_b = event.attendees) === null || _b === void 0 ? void 0 : _b.length);
                console.log("   Max Attendees:", event.max_attendees);
            }
            if (!event) {
                console.log("❌ [DEBUG] Event not found, returning 404");
                return res.status(404).json({
                    success: false,
                    message: "Event not found"
                });
            }
            // === Event validation checks ===
            console.log("🔍 [DEBUG] Performing event validation checks...");
            if (event.status === "Cancelled") {
                console.log("❌ [DEBUG] Event is cancelled");
                return res.status(400).json({
                    success: false,
                    message: "Cannot register for a cancelled event"
                });
            }
            if (event.registration_deadline && new Date() > new Date(event.registration_deadline)) {
                console.log("❌ [DEBUG] Registration deadline has passed");
                return res.status(400).json({
                    success: false,
                    message: "Registration deadline has passed"
                });
            }
            if (event.max_attendees && event.attendees.length >= event.max_attendees) {
                console.log("❌ [DEBUG] Event is at full capacity");
                return res.status(400).json({
                    success: false,
                    message: "Event is at full capacity"
                });
            }
            // === Check for existing registration ===
            console.log("🔍 [DEBUG] Checking for existing registration for user:", userId);
            const existingAttendee = await attendeeRepo.findOne({
                where: { event: { id }, user: { id: userId } },
            });
            console.log("   Existing Registration Found:", !!existingAttendee);
            if (existingAttendee) {
                console.log("❌ [DEBUG] User already registered");
                return res.status(400).json({
                    success: false,
                    message: "Already registered for this event"
                });
            }
            // === Determine registration status ===
            const registrationStatus = event.requires_approval
                ? EventAttendee_1.RegistrationStatus.REGISTERED
                : EventAttendee_1.RegistrationStatus.APPROVED;
            console.log("🔍 [DEBUG] Creating new attendee record:");
            console.log("   Event ID:", attendeeData.event_id);
            console.log("   User ID:", attendeeData.user_id);
            console.log("   Registration Status:", registrationStatus);
            console.log("   Status Enum Value:", registrationStatus);
            console.log("   Requires Approval:", event.requires_approval);
            // === Create attendee record with validated data ===
            const attendeeToSave = {
                event: { id: attendeeData.event_id },
                user: { id: attendeeData.user_id },
                registration_status: registrationStatus,
                registered_at: new Date(),
                approval_note: attendeeData.additional_notes,
            };
            console.log("🔍 [DEBUG] Attendee object to be saved:");
            console.log(JSON.stringify(attendeeToSave, null, 2));
            const attendee = attendeeRepo.create(attendeeToSave);
            console.log("🔍 [DEBUG] Attendee entity created, now saving to database...");
            await attendeeRepo.save(attendee);
            console.log("✅ [DEBUG] Successfully saved attendee to database");
            console.log("   New Attendee ID:", attendee.id);
            console.log("   Final Registration Status:", attendee.registration_status);
            console.log("   Registered At:", attendee.registered_at);
            // === Prepare response data ===
            const responseData = {
                requires_approval: event.requires_approval,
                registration_status: attendee.registration_status,
                attendee_id: attendee.id,
                event_id: event.id,
                user_id: userId,
                registered_at: attendee.registered_at,
            };
            console.log("🔍 [DEBUG] Sending response with data:");
            console.log(JSON.stringify(responseData, null, 2));
            res.json({
                success: true,
                message: event.requires_approval
                    ? "Registration submitted for approval"
                    : "Registered for event successfully",
                data: responseData
            });
        }
        catch (error) {
            // === Detailed error logging ===
            console.error("💥 [DEBUG] ERROR in registerForEvent:");
            console.error("   Error Name:", error.name);
            console.error("   Error Message:", error.message);
            console.error("   Error Stack:", error.stack);
            if (error.driverError) {
                console.error("   Driver Error Code:", error.driverError.code);
                console.error("   Driver Error Detail:", error.driverError.detail);
            }
            if (error.query) {
                console.error("   Failed Query:", error.query);
            }
            if (error.parameters) {
                console.error("   Query Parameters:", error.parameters);
            }
            res.status(500).json({
                success: false,
                message: "Failed to register for event",
                error: error.message,
                details: process.env.NODE_ENV === 'development' ? {
                    errorName: error.name,
                    driverErrorCode: (_c = error.driverError) === null || _c === void 0 ? void 0 : _c.code,
                    stack: error.stack
                } : undefined
            });
        }
    }
    // NEW: Unregister from event
    static async unregisterFromEvent(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.userId;
            const attendeeRepo = db_1.default.getRepository(EventAttendee_1.EventAttendee);
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
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: "Failed to cancel registration",
                error: error.message
            });
        }
    }
    // NEW: Add agenda item
    static async addAgendaItem(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.userId;
            const { session_title, description, speaker_name, start_time, end_time, session_type, linked_project_id, display_order } = req.body;
            const eventRepo = db_1.default.getRepository(Event_1.Event);
            const agendaRepo = db_1.default.getRepository(EventAgenda_1.EventAgenda);
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
            // Check if user is the organizer
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
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: "Failed to add agenda item",
                error: error.message
            });
        }
    }
    // NEW: Update agenda item
    static async updateAgendaItem(req, res) {
        try {
            const { id, agendaId } = req.params;
            const userId = req.user.userId;
            const updateData = req.body;
            const eventRepo = db_1.default.getRepository(Event_1.Event);
            const agendaRepo = db_1.default.getRepository(EventAgenda_1.EventAgenda);
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
            // Check if user is the organizer
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
            // Update fields
            if (updateData.session_title)
                agendaItem.session_title = updateData.session_title;
            if (updateData.description !== undefined)
                agendaItem.description = updateData.description;
            if (updateData.speaker_name !== undefined)
                agendaItem.speaker_name = updateData.speaker_name;
            if (updateData.start_time)
                agendaItem.start_time = updateData.start_time;
            if (updateData.end_time)
                agendaItem.end_time = updateData.end_time;
            if (updateData.session_type)
                agendaItem.session_type = updateData.session_type;
            if (updateData.display_order !== undefined)
                agendaItem.display_order = parseInt(updateData.display_order);
            await agendaRepo.save(agendaItem);
            res.json({
                success: true,
                message: "Agenda item updated successfully",
                data: { agendaItem },
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: "Failed to update agenda item",
                error: error.message
            });
        }
    }
    // NEW: Delete agenda item
    static async deleteAgendaItem(req, res) {
        try {
            const { id, agendaId } = req.params;
            const userId = req.user.userId;
            const eventRepo = db_1.default.getRepository(Event_1.Event);
            const agendaRepo = db_1.default.getRepository(EventAgenda_1.EventAgenda);
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
            // Check if user is the organizer
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
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: "Failed to delete agenda item",
                error: error.message
            });
        }
    }
    // NEW: Get event attendees
    static async getEventAttendees(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.userId;
            const { page = 1, limit = 20, status } = req.query;
            const eventRepo = db_1.default.getRepository(Event_1.Event);
            const attendeeRepo = db_1.default.getRepository(EventAttendee_1.EventAttendee);
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
            // Check if user is the organizer
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
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: "Failed to fetch attendees",
                error: error.message
            });
        }
    }
    static async updateAttendeeStatus(req, res) {
        try {
            const { id, userId } = req.params;
            const { status } = req.body;
            const organizerId = req.user.userId;
            const eventRepo = db_1.default.getRepository(Event_1.Event);
            const attendeeRepo = db_1.default.getRepository(EventAttendee_1.EventAttendee);
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
            // Check if user is the organizer
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
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: "Failed to update attendee status",
                error: error.message
            });
        }
    }
    // NEW: Remove attendee
    static async removeAttendee(req, res) {
        try {
            const { id, userId } = req.params;
            const organizerId = req.user.userId;
            const eventRepo = db_1.default.getRepository(Event_1.Event);
            const attendeeRepo = db_1.default.getRepository(EventAttendee_1.EventAttendee);
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
            // Check if user is the organizer
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
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: "Failed to remove attendee",
                error: error.message
            });
        }
    }
    static async getAllEventsForAdmin(req, res) {
        try {
            console.log("\n🔍 [GET ALL EVENTS FOR ADMIN] Starting...");
            const { page = 1, limit = 1000, search, event_type, status, event_mode } = req.query;
            const eventRepo = db_1.default.getRepository(Event_1.Event);
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
            // Apply filters
            if (search) {
                queryBuilder.andWhere("(event.title ILIKE :search OR event.description ILIKE :search OR organizer.first_name ILIKE :search OR organizer.last_name ILIKE :search)", { search: `%${search}%` });
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
            // Get total count
            const total = await queryBuilder.getCount();
            // Apply pagination
            const skip = (Number(page) - 1) * Number(limit);
            queryBuilder.skip(skip).take(Number(limit));
            // Order by created date
            queryBuilder.orderBy("event.created_at", "DESC");
            const events = await queryBuilder.getMany();
            console.log(`✅ Retrieved ${events.length} events (Total: ${total})`);
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
        }
        catch (error) {
            console.error("❌ Get all events for admin error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to fetch events",
                error: error.message
            });
        }
    }
    /**
     * Activate/Deactivate event (Admin only)
     * Changes event status and sends notification email
     */
    static async activateDeactivateEvent(req, res) {
        try {
            console.log("\n🔄 ========== ACTIVATE/DEACTIVATE EVENT START ==========");
            const { id } = req.params;
            const { status, reason } = req.body;
            console.log("📥 Request Data:", { eventId: id, status, reason });
            // Validate status
            if (!status || !["Upcoming", "Cancelled"].includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: "Valid status required (Upcoming or Cancelled)"
                });
            }
            const eventRepo = db_1.default.getRepository(Event_1.Event);
            const event = await eventRepo.findOne({
                where: { id },
                relations: ["organizer", "organizer.profile", "community"]
            });
            if (!event) {
                console.log("❌ Event not found");
                return res.status(404).json({
                    success: false,
                    message: "Event not found"
                });
            }
            console.log("✅ Event found:", {
                title: event.title,
                currentStatus: event.status,
                newStatus: status
            });
            // Update event status
            const oldStatus = event.status;
            event.status = status;
            await eventRepo.save(event);
            console.log(`✅ Event status updated to: ${status}`);
            // Send email notification
            console.log("\n📧 ========== EMAIL NOTIFICATION START ==========");
            try {
                const isActivation = status === "Upcoming";
                const emailHtml = ActivateDeactivateCancelEventTemplate_1.ActivateDeactivateCancelEventTemplate.getStatusChangeTemplate(event, isActivation, reason);
                const emailSubject = isActivation
                    ? `✅ Your Event "${event.title}" Has Been Activated`
                    : `⚠️ Your Event "${event.title}" Has Been Cancelled`;
                await (0, utils_1.sendEmail)({
                    to: event.organizer.email,
                    subject: emailSubject,
                    html: emailHtml
                });
                console.log(`✅ Email sent successfully to: ${event.organizer.email}`);
            }
            catch (emailError) {
                console.error("❌ Email sending failed:", emailError.message);
            }
            console.log("📧 ========== EMAIL NOTIFICATION END ==========\n");
            console.log("🔄 ========== ACTIVATE/DEACTIVATE EVENT END ==========\n");
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
        }
        catch (error) {
            console.error("❌ Activate/Deactivate event error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to update event status",
                error: error.message
            });
        }
    }
    /**
     * Cancel event permanently (Admin only)
     * Sets status to Cancelled and sends notification
     */
    static async cancelEventPermanently(req, res) {
        var _a;
        try {
            console.log("\n❌ ========== CANCEL EVENT PERMANENTLY START ==========");
            const { id } = req.params;
            const { reason } = req.body;
            console.log("📥 Request Data:", { eventId: id, reason });
            if (!reason || reason.trim().length < 20) {
                return res.status(400).json({
                    success: false,
                    message: "Please provide a detailed reason (at least 20 characters)"
                });
            }
            const eventRepo = db_1.default.getRepository(Event_1.Event);
            const event = await eventRepo.findOne({
                where: { id },
                relations: ["organizer", "organizer.profile", "community", "attendees", "attendees.user"]
            });
            if (!event) {
                console.log("❌ Event not found");
                return res.status(404).json({
                    success: false,
                    message: "Event not found"
                });
            }
            console.log("✅ Event found:", {
                title: event.title,
                organizer: `${event.organizer.first_name} ${event.organizer.last_name}`,
                attendeeCount: ((_a = event.attendees) === null || _a === void 0 ? void 0 : _a.length) || 0
            });
            // Update event status to Cancelled
            event.status = Event_1.EventStatus.CANCELLED;
            await eventRepo.save(event);
            console.log("✅ Event status set to Cancelled");
            // Send email notification to organizer
            console.log("\n📧 ========== EMAIL NOTIFICATION TO ORGANIZER ==========");
            try {
                const emailHtml = ActivateDeactivateCancelEventTemplate_1.ActivateDeactivateCancelEventTemplate.getCancellationTemplate(event, reason);
                await (0, utils_1.sendEmail)({
                    to: event.organizer.email,
                    subject: `🚨 Your Event "${event.title}" Has Been Cancelled`,
                    html: emailHtml
                });
                console.log(`✅ Email sent to organizer: ${event.organizer.email}`);
            }
            catch (emailError) {
                console.error("❌ Email to organizer failed:", emailError.message);
            }
            console.log("📧 ========== EMAIL NOTIFICATION END ==========\n");
            console.log("❌ ========== CANCEL EVENT PERMANENTLY END ==========\n");
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
        }
        catch (error) {
            console.error("❌ Cancel event permanently error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to cancel event",
                error: error.message
            });
        }
    }
    static async getLatestUpcomingEvents(req, res) {
        try {
            console.log("\n🔍 ========== GET LATEST UPCOMING EVENTS START ==========");
            console.log("📅 Current server time:", new Date().toISOString());
            const eventRepo = db_1.default.getRepository(Event_1.Event);
            // First, let's check what events exist
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
            console.log("\n📊 DEBUG: Sample of events in database:");
            debugQuery.forEach((e, idx) => {
                const now = new Date();
                const isEnded = new Date(e.end_datetime) < now;
                const hasStarted = new Date(e.start_datetime) < now;
                console.log(`\n   ${idx + 1}. ${e.title}`);
                console.log(`      ID: ${e.id}`);
                console.log(`      Status: ${e.status}`);
                console.log(`      Start: ${new Date(e.start_datetime).toISOString()}`);
                console.log(`      End: ${new Date(e.end_datetime).toISOString()}`);
                console.log(`      Has Started: ${hasStarted}`);
                console.log(`      Has Ended: ${isEnded}`);
            });
            // Main query - fetch upcoming events that haven't ended
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
                .where("event.status = :status", { status: Event_1.EventStatus.UPCOMING })
                // ✅ KEY FIX: Check if event hasn't ended (not if it hasn't started)
                .andWhere("event.end_datetime > :now", { now: new Date() })
                .orderBy("event.start_datetime", "ASC")
                .take(3);
            const events = await queryBuilder.getMany();
            console.log(`\n✅ Query Result: Retrieved ${events.length} upcoming events`);
            if (events.length > 0) {
                console.log("\n📅 Returned Events:");
                events.forEach((event, idx) => {
                    var _a, _b;
                    console.log(`\n   ${idx + 1}. ${event.title}`);
                    console.log(`      ID: ${event.id}`);
                    console.log(`      Type: ${event.event_type}`);
                    console.log(`      Mode: ${event.event_mode}`);
                    console.log(`      Status: ${event.status}`);
                    console.log(`      Start: ${new Date(event.start_datetime).toISOString()}`);
                    console.log(`      End: ${new Date(event.end_datetime).toISOString()}`);
                    console.log(`      Organizer: ${event.organizer.first_name} ${event.organizer.last_name}`);
                    console.log(`      Community: ${((_a = event.community) === null || _a === void 0 ? void 0 : _a.name) || 'None'}`);
                    console.log(`      Attendees: ${((_b = event.attendees) === null || _b === void 0 ? void 0 : _b.length) || 0}`);
                });
            }
            else {
                console.log("\n⚠️ No upcoming events found!");
                console.log("\n🔍 Possible reasons:");
                console.log("   1. No events with status='Upcoming' in database");
                console.log("   2. All 'Upcoming' events have already ended");
                console.log("   3. Database might have different EventStatus enum values");
                // Additional debug: Check for any events with any status
                const anyEvents = await eventRepo.count();
                console.log(`\n   Total events in database: ${anyEvents}`);
                // Check status distribution
                const statusCounts = await eventRepo
                    .createQueryBuilder("event")
                    .select("event.status", "status")
                    .addSelect("COUNT(*)", "count")
                    .groupBy("event.status")
                    .getRawMany();
                console.log("\n   Event status distribution:");
                statusCounts.forEach(s => {
                    console.log(`      ${s.status}: ${s.count}`);
                });
            }
            console.log("\n🔍 ========== GET LATEST UPCOMING EVENTS END ==========\n");
            res.json({
                success: true,
                data: {
                    events
                }
            });
        }
        catch (error) {
            console.error("\n❌ ========== ERROR IN GET LATEST UPCOMING EVENTS ==========");
            console.error("Error message:", error.message);
            console.error("Error stack:", error.stack);
            console.error("========================================================\n");
            res.status(500).json({
                success: false,
                message: "Failed to fetch upcoming events",
                error: error.message
            });
        }
    }
    // ==================== QUICK FIX SCRIPT ====================
    // If events exist but have wrong status, run this migration function once:
    /**
     * Helper function to update event statuses based on dates
     * Call this once if your events have wrong status values
     */
    static async updateEventStatuses(req, res) {
        try {
            const eventRepo = db_1.default.getRepository(Event_1.Event);
            const now = new Date();
            const allEvents = await eventRepo.find();
            let updated = 0;
            for (const event of allEvents) {
                const startDate = new Date(event.start_datetime);
                const endDate = new Date(event.end_datetime);
                let newStatus = event.status;
                if (event.status === Event_1.EventStatus.CANCELLED || event.status === Event_1.EventStatus.DELETED) {
                    // Don't change cancelled or deleted events
                    continue;
                }
                if (endDate < now) {
                    newStatus = Event_1.EventStatus.COMPLETED;
                }
                else if (startDate <= now && endDate > now) {
                    newStatus = Event_1.EventStatus.ONGOING;
                }
                else if (startDate > now) {
                    newStatus = Event_1.EventStatus.UPCOMING;
                }
                if (newStatus !== event.status) {
                    event.status = newStatus;
                    await eventRepo.save(event);
                    updated++;
                    console.log(`✅ Updated event "${event.title}" from ${event.status} to ${newStatus}`);
                }
            }
            res.json({
                success: true,
                message: `Updated ${updated} event statuses`,
                data: { updated }
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: "Failed to update event statuses",
                error: error.message
            });
        }
    }
    static async extendEventDate(req, res) {
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
            const eventRepo = db_1.default.getRepository(Event_1.Event);
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
            // Update event dates
            event.start_datetime = newStart;
            event.end_datetime = newEnd;
            await eventRepo.save(event);
            // Send email notifications
            try {
                // Send to organizer
                const organizerEmail = AdminEventManagementTemplates_1.AdminEventManagementTemplates.getDateExtendedTemplate(event, { start_datetime: newStart, end_datetime: newEnd, reason }, 'organizer');
                await (0, utils_1.sendEmail)({
                    to: event.organizer.email,
                    subject: `📅 Event Date Extended: ${event.title}`,
                    html: organizerEmail
                });
                // Send to attendees
                if (event.attendees && event.attendees.length > 0) {
                    const attendeeEmails = event.attendees
                        .filter(attendee => attendee.registration_status === EventAttendee_1.RegistrationStatus.APPROVED)
                        .map(attendee => attendee.user.email);
                    const attendeeEmailHtml = AdminEventManagementTemplates_1.AdminEventManagementTemplates.getDateExtendedTemplate(event, { start_datetime: newStart, end_datetime: newEnd, reason }, 'attendee');
                    for (const email of attendeeEmails) {
                        await (0, utils_1.sendEmail)({
                            to: email,
                            subject: `📅 Event Date Changed: ${event.title}`,
                            html: attendeeEmailHtml
                        });
                        // Small delay to avoid rate limiting
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                }
            }
            catch (emailError) {
                console.error("Email sending failed:", emailError);
                // Continue even if email fails
            }
            res.json({
                success: true,
                message: "Event date extended successfully and notifications sent",
                data: { event }
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: "Failed to extend event date",
                error: error.message
            });
        }
    }
    /**
     * Close Event Early (Admin only)
     */
    static async closeEvent(req, res) {
        try {
            const { id } = req.params;
            const { reason, send_certificates = false } = req.body;
            if (!reason || reason.length < 20) {
                return res.status(400).json({
                    success: false,
                    message: "Reason is required and must be at least 20 characters long"
                });
            }
            const eventRepo = db_1.default.getRepository(Event_1.Event);
            const attendeeRepo = db_1.default.getRepository(EventAttendee_1.EventAttendee);
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
            // Update event status
            event.status = Event_1.EventStatus.COMPLETED;
            await eventRepo.save(event);
            // Mark attendees as attended if requested
            if (send_certificates && event.attendees) {
                for (const attendee of event.attendees) {
                    if (attendee.registration_status === EventAttendee_1.RegistrationStatus.APPROVED) {
                        attendee.registration_status = EventAttendee_1.RegistrationStatus.ATTENDED;
                        attendee.certificate_issued = true;
                        await attendeeRepo.save(attendee);
                    }
                }
            }
            // Send email notification to organizer
            try {
                const emailHtml = AdminEventManagementTemplates_1.AdminEventManagementTemplates.getEventClosedTemplate(event, { reason, send_certificates });
                await (0, utils_1.sendEmail)({
                    to: event.organizer.email,
                    subject: `✅ Event Closed: ${event.title}`,
                    html: emailHtml
                });
            }
            catch (emailError) {
                console.error("Email sending failed:", emailError);
            }
            res.json({
                success: true,
                message: "Event closed successfully and organizer notified",
                data: { event }
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: "Failed to close event",
                error: error.message
            });
        }
    }
    /**
     * Postpone Event (Admin only)
     */
    static async postponeEvent(req, res) {
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
            const eventRepo = db_1.default.getRepository(Event_1.Event);
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
            // Update event dates
            event.start_datetime = newStart;
            event.end_datetime = newEnd;
            await eventRepo.save(event);
            try {
                const organizerEmail = AdminEventManagementTemplates_1.AdminEventManagementTemplates.getEventPostponedTemplate(event, {
                    oldDates: {
                        start_datetime: oldDates.start_datetime,
                        end_datetime: oldDates.end_datetime
                    },
                    newDates: {
                        start_datetime: newStart,
                        end_datetime: newEnd
                    },
                    reason
                }, 'organizer');
                await (0, utils_1.sendEmail)({
                    to: event.organizer.email,
                    subject: `📅 Event Postponed: ${event.title}`,
                    html: organizerEmail
                });
                // Send to attendees
                if (event.attendees && event.attendees.length > 0) {
                    const attendeeEmails = event.attendees
                        .filter(attendee => attendee.registration_status === EventAttendee_1.RegistrationStatus.APPROVED ||
                        attendee.registration_status === EventAttendee_1.RegistrationStatus.REGISTERED)
                        .map(attendee => attendee.user.email);
                    const attendeeEmailHtml = AdminEventManagementTemplates_1.AdminEventManagementTemplates.getEventPostponedTemplate(event, { oldDates, newDates: { start_datetime: newStart, end_datetime: newEnd }, reason }, 'attendee');
                    for (const email of attendeeEmails) {
                        await (0, utils_1.sendEmail)({
                            to: email,
                            subject: `📅 Event Postponed: ${event.title}`,
                            html: attendeeEmailHtml
                        });
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                }
            }
            catch (emailError) {
                console.error("Email sending failed:", emailError);
            }
            res.json({
                success: true,
                message: "Event postponed successfully and notifications sent",
                data: { event }
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: "Failed to postpone event",
                error: error.message
            });
        }
    }
    /**
     * Transfer Event Ownership (Admin only)
     */
    static async transferOwnership(req, res) {
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
            const eventRepo = db_1.default.getRepository(Event_1.Event);
            const userRepo = db_1.default.getRepository(User_1.User);
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
            // Update event organizer
            event.organizer = newOrganizer;
            await eventRepo.save(event);
            // Send email notifications
            try {
                // Send to old organizer
                const oldOrganizerEmail = AdminEventManagementTemplates_1.AdminEventManagementTemplates.getOwnershipTransferredTemplate(event, { oldOrganizer, newOrganizer, reason }, 'old_organizer');
                await (0, utils_1.sendEmail)({
                    to: oldOrganizer.email,
                    subject: `🔄 Event Ownership Transferred: ${event.title}`,
                    html: oldOrganizerEmail
                });
                // Send to new organizer
                const newOrganizerEmail = AdminEventManagementTemplates_1.AdminEventManagementTemplates.getOwnershipTransferredTemplate(event, { oldOrganizer, newOrganizer, reason }, 'new_organizer');
                await (0, utils_1.sendEmail)({
                    to: newOrganizer.email,
                    subject: `🎉 You're Now the Organizer: ${event.title}`,
                    html: newOrganizerEmail
                });
            }
            catch (emailError) {
                console.error("Email sending failed:", emailError);
            }
            res.json({
                success: true,
                message: "Event ownership transferred successfully and notifications sent",
                data: { event }
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: "Failed to transfer event ownership",
                error: error.message
            });
        }
    }
    /**
     * Bulk Attendee Actions (Admin only)
     */
    static async bulkAttendeeAction(req, res) {
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
            const eventRepo = db_1.default.getRepository(Event_1.Event);
            const attendeeRepo = db_1.default.getRepository(EventAttendee_1.EventAttendee);
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
                details: []
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
                    // Update registration status
                    attendee.registration_status = action === 'approve'
                        ? EventAttendee_1.RegistrationStatus.APPROVED
                        : EventAttendee_1.RegistrationStatus.REJECTED;
                    await attendeeRepo.save(attendee);
                    results.succeeded++;
                    results.details.push({
                        user_id: userId,
                        status: 'succeeded'
                    });
                    // Send email notification to attendee
                    try {
                        const emailHtml = AdminEventManagementTemplates_1.AdminEventManagementTemplates.getBulkActionTemplate(event, { action, reason, user: attendee.user });
                        await (0, utils_1.sendEmail)({
                            to: attendee.user.email,
                            subject: `📧 Event Registration ${action === 'approve' ? 'Approved' : 'Rejected'}: ${event.title}`,
                            html: emailHtml
                        });
                    }
                    catch (emailError) {
                        console.error(`Email failed for user ${userId}:`, emailError);
                    }
                }
                catch (error) {
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
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: "Failed to process bulk attendee action",
                error: error.message
            });
        }
    }
    /**
     * Export Attendees (Admin only)
     */
    static async exportAttendees(req, res) {
        try {
            const { id } = req.params;
            const { status, format = 'csv' } = req.query;
            const eventRepo = db_1.default.getRepository(Event_1.Event);
            const attendeeRepo = db_1.default.getRepository(EventAttendee_1.EventAttendee);
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
                // Generate CSV
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
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: "Failed to export attendees",
                error: error.message
            });
        }
    }
    /**
     * Get Event Statistics (Admin only)
     */
    static async getEventStatistics(req, res) {
        var _a, _b, _c, _d, _e, _f, _g;
        try {
            const { id } = req.params;
            const eventRepo = db_1.default.getRepository(Event_1.Event);
            const attendeeRepo = db_1.default.getRepository(EventAttendee_1.EventAttendee);
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
            // Calculate statistics
            const totalRegistrations = ((_a = event.attendees) === null || _a === void 0 ? void 0 : _a.length) || 0;
            const statusCounts = {
                pending: ((_b = event.attendees) === null || _b === void 0 ? void 0 : _b.filter(a => a.registration_status === EventAttendee_1.RegistrationStatus.REGISTERED).length) || 0,
                approved: ((_c = event.attendees) === null || _c === void 0 ? void 0 : _c.filter(a => a.registration_status === EventAttendee_1.RegistrationStatus.APPROVED).length) || 0,
                rejected: ((_d = event.attendees) === null || _d === void 0 ? void 0 : _d.filter(a => a.registration_status === EventAttendee_1.RegistrationStatus.REJECTED).length) || 0,
                attended: ((_e = event.attendees) === null || _e === void 0 ? void 0 : _e.filter(a => a.registration_status === EventAttendee_1.RegistrationStatus.ATTENDED).length) || 0,
                waitlisted: ((_f = event.attendees) === null || _f === void 0 ? void 0 : _f.filter(a => a.registration_status === EventAttendee_1.RegistrationStatus.WAITLISTED).length) || 0
            };
            const approvalRate = totalRegistrations > 0
                ? (statusCounts.approved / totalRegistrations) * 100
                : 0;
            // Registration timeline (last 7 days)
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
                recentActivity: ((_g = event.attendees) === null || _g === void 0 ? void 0 : _g.slice(0, 10).map(attendee => ({
                    user: `${attendee.user.first_name} ${attendee.user.last_name}`,
                    action: 'registered',
                    timestamp: attendee.registered_at,
                    status: attendee.registration_status
                }))) || []
            };
            res.json({
                success: true,
                data: { statistics }
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: "Failed to fetch event statistics",
                error: error.message
            });
        }
    }
    /**
     * Duplicate Event (Admin only)
     */
    static async duplicateEvent(req, res) {
        var _a;
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
            const eventRepo = db_1.default.getRepository(Event_1.Event);
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
            // Create new event with copied data
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
                status: Event_1.EventStatus.UPCOMING,
                organizer: { id: userId }, // Set current admin as organizer
                community: originalEvent.community,
                // Don't copy attendees
                agenda_items: ((_a = originalEvent.agenda_items) === null || _a === void 0 ? void 0 : _a.map(agenda => ({
                    session_title: agenda.session_title,
                    description: agenda.description,
                    speaker_name: agenda.speaker_name,
                    start_time: agenda.start_time,
                    end_time: agenda.end_time,
                    session_type: agenda.session_type,
                    display_order: agenda.display_order
                }))) || [],
                linked_projects: originalEvent.linked_projects || []
            });
            await eventRepo.save(newEvent);
            res.json({
                success: true,
                message: "Event duplicated successfully",
                data: { event: newEvent }
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: "Failed to duplicate event",
                error: error.message
            });
        }
    }
}
exports.EventController = EventController;
