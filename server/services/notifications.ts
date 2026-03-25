import { storage } from '../storage';
import { emailService } from './email';
import { MaintenanceTask, User, Property, Agency } from '@shared/schema';

class NotificationService {
  async sendMaintenanceReminder(taskId: number): Promise<boolean> {
    try {
      const task = await storage.getMaintenanceTask(taskId);
      if (!task) return false;

      const property = await storage.getProperty(task.propertyId);
      if (!property || !property.ownerId) return false;

      const owner = await storage.getUser(property.ownerId);
      if (!owner) return false;

      const agency = await storage.getAgency(task.agencyId);
      if (!agency) return false;

      // Send email notification
      const emailSent = await emailService.sendMaintenanceReminder(agency, owner, property, task);

      // Log notification
      await storage.createNotificationLog({
        agencyId: task.agencyId,
        recipientId: owner.id,
        type: 'maintenance_reminder',
        channel: 'email',
        subject: `Maintenance Scheduled: ${task.title}`,
        message: `Maintenance reminder sent for ${property.name}`,
        taskId: task.id,
        propertyId: property.id,
        status: emailSent ? 'sent' : 'failed',
      });

      // Update task notification status
      if (emailSent) {
        await storage.updateMaintenanceTask(task.id, {
          ownerNotified: true,
          ownerNotificationDate: new Date(),
        });
      }

      return emailSent;
    } catch (error) {
      console.error('Failed to send maintenance reminder:', error);
      return false;
    }
  }

  async sendTaskCompletionNotice(taskId: number): Promise<boolean> {
    try {
      const task = await storage.getMaintenanceTask(taskId);
      if (!task || task.status !== 'completed') return false;

      const property = await storage.getProperty(task.propertyId);
      if (!property || !property.ownerId) return false;

      const owner = await storage.getUser(property.ownerId);
      if (!owner) return false;

      const agency = await storage.getAgency(task.agencyId);
      if (!agency) return false;

      // Send email notification
      const photos = task.completionPhotos as string[] || [];
      const emailSent = await emailService.sendTaskCompletionNotice(agency, owner, property, task, photos);

      // Log notification
      await storage.createNotificationLog({
        agencyId: task.agencyId,
        recipientId: owner.id,
        type: 'completion_notice',
        channel: 'email',
        subject: `Maintenance Completed: ${task.title}`,
        message: `Completion notice sent for ${property.name}`,
        taskId: task.id,
        propertyId: property.id,
        status: emailSent ? 'sent' : 'failed',
      });

      return emailSent;
    } catch (error) {
      console.error('Failed to send completion notice:', error);
      return false;
    }
  }

  async sendOverdueAlerts(agencyId: number): Promise<number> {
    try {
      const overdueTasks = await storage.getOverdueTasks(agencyId);
      let sentCount = 0;

      for (const task of overdueTasks) {
        const property = await storage.getProperty(task.propertyId);
        if (!property || !property.ownerId) continue;

        const owner = await storage.getUser(property.ownerId);
        if (!owner) continue;

        const agency = await storage.getAgency(agencyId);
        if (!agency) continue;

        // Send overdue alert
        const emailSent = await emailService.sendOverdueAlert(agency, owner, property, task);

        // Log notification
        await storage.createNotificationLog({
          agencyId: agencyId,
          recipientId: owner.id,
          type: 'overdue_alert',
          channel: 'email',
          subject: `OVERDUE: ${task.title}`,
          message: `Overdue alert sent for ${property.name}`,
          taskId: task.id,
          propertyId: property.id,
          status: emailSent ? 'sent' : 'failed',
        });

        if (emailSent) {
          sentCount++;
        }
      }

      return sentCount;
    } catch (error) {
      console.error('Failed to send overdue alerts:', error);
      return 0;
    }
  }

  async scheduleNotificationsForTask(taskId: number): Promise<void> {
    try {
      const task = await storage.getMaintenanceTask(taskId);
      if (!task) return;

      // Schedule reminder notification (e.g., 3 days before due date)
      const reminderDate = new Date(task.dueDate);
      reminderDate.setDate(reminderDate.getDate() - 3);

      // In a real application, you would use a job scheduler like node-cron or bull queue
      // For now, we'll just send the reminder if it's within the next 3 days
      const now = new Date();
      const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

      if (task.dueDate <= threeDaysFromNow && !task.ownerNotified) {
        await this.sendMaintenanceReminder(taskId);
      }
    } catch (error) {
      console.error('Failed to schedule notifications:', error);
    }
  }

  async processPendingNotifications(agencyId: number): Promise<void> {
    try {
      // Get upcoming tasks that need notifications
      const upcomingTasks = await storage.getUpcomingTasks(agencyId, 7);
      
      for (const task of upcomingTasks) {
        if (!task.ownerNotified) {
          await this.scheduleNotificationsForTask(task.id);
        }
      }

      // Send overdue alerts
      await this.sendOverdueAlerts(agencyId);
    } catch (error) {
      console.error('Failed to process pending notifications:', error);
    }
  }

  async sendPasswordResetEmail(email: string, firstName: string, resetUrl: string): Promise<boolean> {
    try {
      return await emailService.sendPasswordResetEmail(email, firstName, resetUrl);
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      return false;
    }
  }
}

export const notificationService = new NotificationService();
