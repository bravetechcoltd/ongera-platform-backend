import dbConnection from "../database/db";
import { Event, EventStatus } from "../database/models/Event";
import { EventAttendee, RegistrationStatus } from "../database/models/EventAttendee";
import { sendEmail } from "../helpers/utils";
import { EventReminderTemplates } from "../helpers/EventReminderTemplates";
import { logger } from "../helpers/logger";
import { AdminEventManagementTemplates } from "../helpers/AdminEventManagementTemplates";

export class EventReminderScheduler {
  private static intervalId: NodeJS.Timeout | null = null;

  /**
   * Start the scheduler to run every 5 minutes
   */
  static start() {
    if (this.intervalId) {
      logger.warn("EventReminderScheduler is already running");
      return;
    }

    logger.info("Starting EventReminderScheduler...");

    // Run immediately on start
    this.checkAndSendReminders();

    // Run every 5 minutes
    this.intervalId = setInterval(() => {
      this.checkAndSendReminders().catch(err => {
        logger.error("Error in EventReminderScheduler:", err);
      });
    }, 5 * 60 * 1000); // 5 minutes

    logger.info("EventReminderScheduler started successfully");
  }

  /**
   * Stop the scheduler
   */
  static stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info("EventReminderScheduler stopped");
    }
  }

  /**
   * Check and send reminders
   */
  private static async checkAndSendReminders() {
    try {
      const eventRepo = dbConnection.getRepository(Event);
      const attendeeRepo = dbConnection.getRepository(EventAttendee);
      const now = new Date();

      // Get all upcoming and ongoing events
      const events = await eventRepo.find({
        where: {
          status: EventStatus.UPCOMING || EventStatus.ONGOING,
        },
        relations: ["attendees", "attendees.user", "organizer"],
      });

      for (const event of events) {
        const eventStart = new Date(event.start_datetime);
        const timeDiffMs = eventStart.getTime() - now.getTime();
        const timeDiffMinutes = timeDiffMs / (1000 * 60);

        // Check for 24-hour reminder (1440 minutes ± 5 minutes buffer)
        if (
          timeDiffMinutes > 1435 &&
          timeDiffMinutes < 1445 &&
          !event.reminder_24h_sent_at
        ) {
          await this.send24HourReminder(event, attendeeRepo);
          event.reminder_24h_sent_at = now;
          await eventRepo.save(event);
          logger.info(`24-hour reminder sent for event: ${event.id}`);
        }

        // Check for 1-hour reminder (60 minutes ± 5 minutes buffer)
        if (
          timeDiffMinutes > 55 &&
          timeDiffMinutes < 65 &&
          !event.reminder_1h_sent_at
        ) {
          await this.send1HourReminder(event, attendeeRepo);
          event.reminder_1h_sent_at = now;
          await eventRepo.save(event);
          logger.info(`1-hour reminder sent for event: ${event.id}`);
        }
      }

      // Also handle auto-close for completed events
      await this.autoCloseCompletedEvents(eventRepo);
    } catch (error) {
      logger.error("Error in checkAndSendReminders:", error);
    }
  }

  /**
   * Send 24-hour reminder email to approved attendees
   */
  private static async send24HourReminder(
    event: Event,
    attendeeRepo: any
  ) {
    try {
      const approvedAttendees = await attendeeRepo.find({
        where: {
          event: { id: event.id },
          registration_status: RegistrationStatus.APPROVED,
        },
        relations: ["user"],
      });

      const emailTemplate = EventReminderTemplates.get24HourReminderTemplate(
        event
      );

      for (const attendee of approvedAttendees) {
        try {
          await sendEmail({
            to: attendee.user.email,
            subject: `⏰ Reminder: ${event.title} is tomorrow!`,
            html: emailTemplate(attendee.user),
          });

          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (emailError) {
          logger.error(
            `Failed to send 24-hour reminder to ${attendee.user.email}:`,
            emailError
          );
        }
      }
    } catch (error) {
      logger.error("Error sending 24-hour reminders:", error);
    }
  }

  /**
   * Send 1-hour reminder email to approved attendees
   */
  private static async send1HourReminder(
    event: Event,
    attendeeRepo: any
  ) {
    try {
      const approvedAttendees = await attendeeRepo.find({
        where: {
          event: { id: event.id },
          registration_status: RegistrationStatus.APPROVED,
        },
        relations: ["user"],
      });

      const emailTemplate = EventReminderTemplates.get1HourReminderTemplate(
        event
      );

      for (const attendee of approvedAttendees) {
        try {
          await sendEmail({
            to: attendee.user.email,
            subject: `🎯 Starting Soon: ${event.title} in 1 hour!`,
            html: emailTemplate(attendee.user),
          });

          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (emailError) {
          logger.error(
            `Failed to send 1-hour reminder to ${attendee.user.email}:`,
            emailError
          );
        }
      }
    } catch (error) {
      logger.error("Error sending 1-hour reminders:", error);
    }
  }

  /**
   * Auto-close events that have ended
   */
  private static async autoCloseCompletedEvents(eventRepo: any) {
    try {
      const now = new Date();
      const completedEvents = await eventRepo.find({
        where: {
          status: EventStatus.UPCOMING || EventStatus.ONGOING,
        },
      });

      for (const event of completedEvents) {
        const eventEnd = new Date(event.end_datetime);
        if (eventEnd < now && event.status !== EventStatus.COMPLETED) {
          event.status = EventStatus.COMPLETED;
          await eventRepo.save(event);

          // Send closure notification to organizer
          try {
            const emailHtml = AdminEventManagementTemplates.getEventClosedTemplate(
              event,
              {
                reason: "Event ended automatically based on scheduled end time",
                send_certificates: false,
              }
            );

            await sendEmail({
              to: event.organizer.email,
              subject: `✅ Event Completed: ${event.title}`,
              html: emailHtml,
            });
          } catch (emailError) {
            logger.error("Failed to send closure notification:", emailError);
          }

          logger.info(`Event auto-closed: ${event.id}`);
        }
      }
    } catch (error) {
      logger.error("Error auto-closing events:", error);
    }
  }
}