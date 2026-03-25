import sgMail from '@sendgrid/mail';
import { Agency, User, Property, MaintenanceTask } from '@shared/schema';

// SendGrid integration helper - connection:conn_sendgrid_01KCAVXF43YBQ38CMFQ7EZ29VT
async function getSendGridClient() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken || !hostname) {
    console.log('SendGrid credentials not available, emails will be logged only');
    return null;
  }

  try {
    const response = await fetch(
      'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=sendgrid',
      {
        headers: {
          'Accept': 'application/json',
          'X_REPLIT_TOKEN': xReplitToken
        }
      }
    );
    const data = await response.json();
    const connectionSettings = data.items?.[0];

    if (!connectionSettings || !connectionSettings.settings?.api_key || !connectionSettings.settings?.from_email) {
      console.log('SendGrid not connected or missing credentials');
      return null;
    }

    sgMail.setApiKey(connectionSettings.settings.api_key);
    return {
      client: sgMail,
      fromEmail: connectionSettings.settings.from_email
    };
  } catch (error) {
    console.error('Failed to get SendGrid credentials:', error);
    return null;
  }
}

class EmailService {
  constructor() {
    // No initialization needed - SendGrid client is fetched fresh each time
  }

  async sendMaintenanceReminder(
    agency: Agency,
    owner: User,
    property: Property,
    task: MaintenanceTask
  ): Promise<boolean> {
    try {
      const subject = `Maintenance Scheduled: ${task.title} - ${property.name}`;
      const html = this.generateMaintenanceReminderTemplate(agency, owner, property, task);

      const sendgrid = await getSendGridClient();
      if (!sendgrid) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[DEV] Email logged (SendGrid not configured):', { to: owner.email, subject });
          return true;
        }
        console.error('SendGrid not configured - maintenance reminder not sent');
        return false;
      }

      await sendgrid.client.send({
        from: sendgrid.fromEmail,
        to: owner.email,
        subject,
        html,
      });

      return true;
    } catch (error) {
      console.error('Failed to send maintenance reminder:', error);
      return false;
    }
  }

  async sendTaskCompletionNotice(
    agency: Agency,
    owner: User,
    property: Property,
    task: MaintenanceTask,
    photos?: string[]
  ): Promise<boolean> {
    try {
      const subject = `Maintenance Completed: ${task.title} - ${property.name}`;
      const html = this.generateCompletionNoticeTemplate(agency, owner, property, task, photos);

      const sendgrid = await getSendGridClient();
      if (!sendgrid) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[DEV] Email logged (SendGrid not configured):', { to: owner.email, subject });
          return true;
        }
        console.error('SendGrid not configured - completion notice not sent');
        return false;
      }

      await sendgrid.client.send({
        from: sendgrid.fromEmail,
        to: owner.email,
        subject,
        html,
      });

      return true;
    } catch (error) {
      console.error('Failed to send completion notice:', error);
      return false;
    }
  }

  async sendOverdueAlert(
    agency: Agency,
    owner: User,
    property: Property,
    task: MaintenanceTask
  ): Promise<boolean> {
    try {
      const subject = `OVERDUE: Maintenance Alert - ${task.title} - ${property.name}`;
      const html = this.generateOverdueAlertTemplate(agency, owner, property, task);

      const sendgrid = await getSendGridClient();
      if (!sendgrid) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[DEV] Email logged (SendGrid not configured):', { to: owner.email, subject });
          return true;
        }
        console.error('SendGrid not configured - overdue alert not sent');
        return false;
      }

      await sendgrid.client.send({
        from: sendgrid.fromEmail,
        to: owner.email,
        subject,
        html,
      });

      return true;
    } catch (error) {
      console.error('Failed to send overdue alert:', error);
      return false;
    }
  }

  async sendInspectionReport(
    agency: Agency,
    property: Property,
    inspectionItems: any[],
    recipients: string[]
  ): Promise<boolean> {
    try {
      const subject = `Inspection Report - ${property.name}`;
      const html = this.generateInspectionReportTemplate(agency, property, inspectionItems);

      const sendgrid = await getSendGridClient();
      if (!sendgrid) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[DEV] Email logged (SendGrid not configured):', { to: recipients, subject });
          console.log('[DEV] Report would be sent to:', recipients.join(', '));
          return true;
        }
        console.error('SendGrid not configured - inspection report not sent');
        return false;
      }

      // Send to all recipients
      for (const recipient of recipients) {
        await sendgrid.client.send({
          from: sendgrid.fromEmail,
          to: recipient,
          subject,
          html,
        });
      }

      console.log(`Inspection report sent to ${recipients.length} recipient(s)`);
      return true;
    } catch (error) {
      console.error('Failed to send inspection report:', error);
      return false;
    }
  }

  private generateMaintenanceReminderTemplate(
    agency: Agency,
    owner: User,
    property: Property,
    task: MaintenanceTask
  ): string {
    const brandingColor = (agency.branding as any)?.primaryColor || '#1976D2';
    
    return `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: ${brandingColor}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0;">${agency.name}</h1>
              <p style="margin: 5px 0 0 0;">Scheduled Maintenance Notification</p>
            </div>
            
            <div style="background: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none;">
              <p>Dear ${owner.firstName} ${owner.lastName},</p>
              
              <p>This is a notification that maintenance has been scheduled for your property:</p>
              
              <div style="background: white; padding: 15px; border-radius: 5px; margin: 15px 0;">
                <h3 style="margin: 0 0 10px 0; color: ${brandingColor};">${task.title}</h3>
                <p><strong>Property:</strong> ${property.name}</p>
                <p><strong>Address:</strong> ${property.address}</p>
                <p><strong>Scheduled Date:</strong> ${task.scheduledDate.toLocaleDateString()}</p>
                <p><strong>Priority:</strong> ${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}</p>
                <p><strong>Description:</strong> ${task.description}</p>
              </div>
              
              <p>Our property management team will coordinate this maintenance to ensure minimal disruption. If you have any questions or concerns, please don't hesitate to contact us.</p>
              
              <div style="margin: 20px 0; padding: 15px; background: #e3f2fd; border-radius: 5px;">
                <p style="margin: 0;"><strong>Contact Information:</strong></p>
                <p style="margin: 5px 0 0 0;">Email: ${agency.email}</p>
                ${agency.phone ? `<p style="margin: 5px 0 0 0;">Phone: ${agency.phone}</p>` : ''}
              </div>
              
              <p>Thank you for your attention to this matter.</p>
              <p>Best regards,<br>${agency.name}</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private generateCompletionNoticeTemplate(
    agency: Agency,
    owner: User,
    property: Property,
    task: MaintenanceTask,
    photos?: string[]
  ): string {
    const brandingColor = (agency.branding as any)?.primaryColor || '#1976D2';
    
    return `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: ${brandingColor}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0;">${agency.name}</h1>
              <p style="margin: 5px 0 0 0;">Maintenance Completion Notice</p>
            </div>
            
            <div style="background: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none;">
              <p>Dear ${owner.firstName} ${owner.lastName},</p>
              
              <p>We're pleased to inform you that the scheduled maintenance for your property has been completed:</p>
              
              <div style="background: white; padding: 15px; border-radius: 5px; margin: 15px 0;">
                <h3 style="margin: 0 0 10px 0; color: ${brandingColor};">${task.title}</h3>
                <p><strong>Property:</strong> ${property.name}</p>
                <p><strong>Address:</strong> ${property.address}</p>
                <p><strong>Completed Date:</strong> ${task.completedDate?.toLocaleDateString()}</p>
                ${task.notes ? `<p><strong>Notes:</strong> ${task.notes}</p>` : ''}
              </div>
              
              ${photos && photos.length > 0 ? `
                <div style="margin: 20px 0;">
                  <p><strong>Completion Photos:</strong></p>
                  <p style="font-size: 12px; color: #666;">Documentation photos are available upon request.</p>
                </div>
              ` : ''}
              
              <p>If you have any questions about the completed work or notice any issues, please contact us immediately.</p>
              
              <div style="margin: 20px 0; padding: 15px; background: #e8f5e8; border-radius: 5px;">
                <p style="margin: 0; color: #2e7d32;"><strong>✓ Maintenance Completed Successfully</strong></p>
              </div>
              
              <p>Thank you for your continued trust in our property management services.</p>
              <p>Best regards,<br>${agency.name}</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private generateOverdueAlertTemplate(
    agency: Agency,
    owner: User,
    property: Property,
    task: MaintenanceTask
  ): string {
    const brandingColor = (agency.branding as any)?.primaryColor || '#1976D2';
    
    return `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #d32f2f; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0;">${agency.name}</h1>
              <p style="margin: 5px 0 0 0;">URGENT: Overdue Maintenance Alert</p>
            </div>
            
            <div style="background: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none;">
              <p>Dear ${owner.firstName} ${owner.lastName},</p>
              
              <div style="background: #ffebee; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #f44336;">
                <p style="margin: 0; color: #c62828;"><strong>⚠️ OVERDUE MAINTENANCE REQUIRES IMMEDIATE ATTENTION</strong></p>
              </div>
              
              <p>The following maintenance task for your property is now overdue and requires immediate attention:</p>
              
              <div style="background: white; padding: 15px; border-radius: 5px; margin: 15px 0;">
                <h3 style="margin: 0 0 10px 0; color: #d32f2f;">${task.title}</h3>
                <p><strong>Property:</strong> ${property.name}</p>
                <p><strong>Address:</strong> ${property.address}</p>
                <p><strong>Originally Due:</strong> ${task.dueDate.toLocaleDateString()}</p>
                <p><strong>Priority:</strong> ${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}</p>
                <p><strong>Description:</strong> ${task.description}</p>
              </div>
              
              <p>Please contact us immediately to reschedule or discuss this maintenance item. Delayed maintenance can lead to more serious and costly issues.</p>
              
              <div style="margin: 20px 0; padding: 15px; background: #ffecb3; border-radius: 5px;">
                <p style="margin: 0;"><strong>Immediate Action Required:</strong></p>
                <p style="margin: 5px 0 0 0;">Email: ${agency.email}</p>
                ${agency.phone ? `<p style="margin: 5px 0 0 0;">Phone: ${agency.phone}</p>` : ''}
              </div>
              
              <p>We appreciate your prompt attention to this matter.</p>
              <p>Best regards,<br>${agency.name}</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private generateInspectionReportTemplate(
    agency: Agency,
    property: Property,
    inspectionItems: any[]
  ): string {
    const brandingColor = (agency.branding as any)?.primaryColor || '#1976D2';
    
    // Group items by room
    const itemsByRoom = inspectionItems.reduce((acc: any, item: any) => {
      const roomName = item.roomName || 'General';
      if (!acc[roomName]) {
        acc[roomName] = [];
      }
      acc[roomName].push(item);
      return acc;
    }, {});

    // Generate items that need attention
    const itemsNeedingAttention = inspectionItems.filter(
      item => !item.isCompleted || item.notes
    );

    // Generate photos section
    const photosHtml = inspectionItems
      .filter(item => item.photoUrl)
      .map(item => `
        <div style="margin: 15px 0;">
          <p style="margin: 5px 0; font-weight: bold;">${item.itemName} - ${item.roomName}</p>
          <img src="${item.photoUrl}" alt="${item.itemName}" style="max-width: 100%; border-radius: 5px; margin-top: 5px;" />
        </div>
      `).join('');

    // Generate recommendations section
    const recommendationsHtml = itemsNeedingAttention.length > 0
      ? `
        <div style="background: #fff3e0; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ff9800;">
          <h3 style="margin: 0 0 10px 0; color: #e65100;">Items Requiring Attention</h3>
          ${itemsNeedingAttention.map(item => `
            <div style="margin: 10px 0; padding: 10px; background: white; border-radius: 3px;">
              <p style="margin: 0; font-weight: bold;">${item.itemName} - ${item.roomName}</p>
              ${item.notes ? `<p style="margin: 5px 0 0 0; color: #666;">${item.notes}</p>` : ''}
              ${!item.isCompleted ? '<p style="margin: 5px 0 0 0; color: #e65100; font-weight: bold;">Status: Requires Attention</p>' : ''}
            </div>
          `).join('')}
        </div>
      `
      : '<div style="background: #e8f5e9; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #4caf50;"><p style="margin: 0; color: #2e7d32;"><strong>✓ All inspection items completed successfully</strong></p></div>';

    return `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 800px; margin: 0 auto; padding: 20px;">
            <div style="background: ${brandingColor}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0;">${agency.name}</h1>
              <p style="margin: 5px 0 0 0;">Inspection Completion Report</p>
            </div>
            
            <div style="background: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none;">
              <h2 style="margin: 0 0 15px 0; color: ${brandingColor};">Property Inspection Report</h2>
              
              <div style="background: white; padding: 15px; border-radius: 5px; margin: 15px 0;">
                <h3 style="margin: 0 0 10px 0;">Property Details</h3>
                <p><strong>Property:</strong> ${property.name}</p>
                <p><strong>Address:</strong> ${property.address}</p>
                ${property.unitNumber ? `<p><strong>Unit:</strong> ${property.unitNumber}</p>` : ''}
                <p><strong>Property Type:</strong> ${property.propertyType.charAt(0).toUpperCase() + property.propertyType.slice(1)}</p>
              </div>

              <h3 style="margin: 20px 0 10px 0;">Inspection Summary</h3>
              <div style="background: white; padding: 15px; border-radius: 5px; margin: 15px 0;">
                <p><strong>Total Items Inspected:</strong> ${inspectionItems.length}</p>
                <p><strong>Items Completed:</strong> ${inspectionItems.filter(i => i.isCompleted).length}</p>
                <p><strong>Items Requiring Attention:</strong> ${itemsNeedingAttention.length}</p>
              </div>

              ${recommendationsHtml}

              ${photosHtml ? `
                <h3 style="margin: 20px 0 10px 0;">Inspection Photos</h3>
                <div style="background: white; padding: 15px; border-radius: 5px;">
                  ${photosHtml}
                </div>
              ` : ''}

              <h3 style="margin: 20px 0 10px 0;">Detailed Inspection Items by Room</h3>
              ${Object.keys(itemsByRoom).map(roomName => `
                <div style="background: white; padding: 15px; border-radius: 5px; margin: 15px 0;">
                  <h4 style="margin: 0 0 10px 0; color: ${brandingColor};">${roomName}</h4>
                  ${itemsByRoom[roomName].map((item: any) => `
                    <div style="padding: 10px 0; border-bottom: 1px solid #eee;">
                      <p style="margin: 0; font-weight: bold;">
                        ${item.isCompleted ? '✓' : '○'} ${item.itemName}
                      </p>
                      ${item.notes ? `<p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">${item.notes}</p>` : ''}
                    </div>
                  `).join('')}
                </div>
              `).join('')}

              <div style="margin: 20px 0; padding: 15px; background: #e3f2fd; border-radius: 5px;">
                <p style="margin: 0;"><strong>Questions or Concerns?</strong></p>
                <p style="margin: 5px 0 0 0;">Email: ${agency.email}</p>
                ${agency.phone ? `<p style="margin: 5px 0 0 0;">Phone: ${agency.phone}</p>` : ''}
              </div>
              
              <p>Thank you for your continued trust in our property management services.</p>
              <p>Best regards,<br>${agency.name}</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  async sendPasswordResetEmail(email: string, firstName: string, resetUrl: string): Promise<boolean> {
    try {
      // Only log the reset URL in development mode for security
      if (process.env.NODE_ENV === 'development') {
        console.log('\n=== [DEV] PASSWORD RESET EMAIL ===');
        console.log(`To: ${email}`);
        console.log(`Name: ${firstName}`);
        console.log(`Reset URL: ${resetUrl}`);
        console.log('===================================\n');
      }

      const subject = 'Password Reset Request - My Maintenance Pro';
      const html = `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: #1976D2; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0;">My Maintenance Pro</h1>
                <p style="margin: 5px 0 0 0;">Password Reset Request</p>
              </div>
              
              <div style="background: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none;">
                <p>Hi ${firstName},</p>
                
                <p>We received a request to reset your password for your My Maintenance Pro account.</p>
                
                <p>Click the button below to reset your password. This link will expire in 1 hour for security reasons.</p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${resetUrl}" 
                     style="background: #1976D2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                    Reset My Password
                  </a>
                </div>
                
                <p style="color: #666; font-size: 14px;">
                  Or copy and paste this link into your browser:<br>
                  <a href="${resetUrl}" style="color: #1976D2; word-break: break-all;">${resetUrl}</a>
                </p>
                
                <div style="margin: 20px 0; padding: 15px; background: #fff3e0; border-left: 4px solid #ff9800; border-radius: 3px;">
                  <p style="margin: 0; color: #e65100; font-weight: bold;">Security Notice</p>
                  <p style="margin: 5px 0 0 0; color: #666;">If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
                </div>
                
                <p>Best regards,<br>My Maintenance Pro Team</p>
              </div>
            </div>
          </body>
        </html>
      `;

      const sendgrid = await getSendGridClient();
      if (!sendgrid) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[DEV] Email logged (SendGrid not configured):', { to: email, subject });
          return true;
        }
        console.error('SendGrid not configured - password reset email not sent');
        return false;
      }

      await sendgrid.client.send({
        from: sendgrid.fromEmail,
        to: email,
        subject,
        html,
      });

      return true;
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      // In development, return true since we've logged the URL
      if (process.env.NODE_ENV === 'development') {
        return true;
      }
      return false;
    }
  }
}

export const emailService = new EmailService();
