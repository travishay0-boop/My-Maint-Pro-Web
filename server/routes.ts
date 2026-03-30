import type { Express } from "express";
import { createServer, type Server } from "http";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import bcrypt from "bcrypt";
import { z } from "zod";
import { storage } from "./storage";
import { notificationService } from "./services/notifications";
import { authenticateUser, requireRole, requireAgencyAccess, type AuthenticatedRequest } from "./middleware/auth";
import { 
  insertUserSchema, insertAgencySchema, insertPropertySchema, 
  insertMaintenanceTaskSchema, insertMaintenanceTemplateSchema,
  insertPropertyRoomSchema, insertInspectionItemSchema,
  insertComplianceCertificateSchema, insertServiceProviderSchema,
  loginSchema, registerSchema, signupSchema, forgotPasswordSchema, resetPasswordSchema,
  emailVerificationTokens
} from "@shared/schema";
import { detectCountryFromAddress } from "@shared/compliance-standards";
import { getInspectionIntervalForItem, parseInspectionInterval, calculateNextInspectionDate } from "@shared/inspection-intervals";
import type { Request, Response } from "express";
import multer from "multer";
import { parseCertificateContent, getCertificateInspectionItems } from "./certificate-ai";
import { sendEmail } from "./sendgrid";
import { compareAddresses } from "@shared/address-validation";
import { simpleParser, ParsedMail } from "mailparser";

// Multer for parsing multipart/form-data (SendGrid inbound parse sends this format)
// Increase limits for email content - SendGrid sends large email bodies as form fields
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fieldSize: 50 * 1024 * 1024, // 50MB for text fields (email body can be large)
    fileSize: 25 * 1024 * 1024,  // 25MB for attachments
    files: 10,                    // Max 10 attachments
  }
});

// ============================================
// INBOUND EMAIL PARSING HELPERS
// ============================================

interface ParsedEmailData {
  from: string;
  fromName?: string;
  to: string;
  subject?: string;
  body?: string;
  attachmentUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileBuffer?: Buffer;
}

// Parse raw MIME message using mailparser (for SendGrid "POST raw" mode)
async function parseRawMimeEmail(rawEmail: string): Promise<ParsedEmailData | null> {
  try {
    console.log('Parsing raw MIME message...');
    const parsed: ParsedMail = await simpleParser(rawEmail);
    
    // Extract first attachment if present
    let fileName: string | undefined;
    let fileSize: number | undefined;
    let fileBuffer: Buffer | undefined;
    
    if (parsed.attachments && parsed.attachments.length > 0) {
      const attachment = parsed.attachments[0];
      fileName = attachment.filename;
      fileSize = attachment.size;
      fileBuffer = attachment.content;
      console.log(`Found attachment: ${fileName}, size: ${fileSize} bytes`);
    }
    
    // Get recipient email - handle both string and array formats
    let toEmail = '';
    if (parsed.to) {
      if (typeof parsed.to === 'string') {
        toEmail = parsed.to;
      } else if (Array.isArray(parsed.to)) {
        toEmail = parsed.to[0]?.value?.[0]?.address || parsed.to[0]?.text || '';
      } else if (parsed.to.value) {
        toEmail = parsed.to.value[0]?.address || parsed.to.text || '';
      }
    }
    
    // Get sender email
    let fromEmail = '';
    let fromName = '';
    if (parsed.from) {
      if (typeof parsed.from === 'string') {
        fromEmail = parsed.from;
      } else if (parsed.from.value && parsed.from.value[0]) {
        fromEmail = parsed.from.value[0].address || '';
        fromName = parsed.from.value[0].name || '';
      } else if (parsed.from.text) {
        fromEmail = parsed.from.text;
      }
    }
    
    return {
      from: fromEmail,
      fromName: fromName || undefined,
      to: toEmail,
      subject: parsed.subject,
      body: parsed.text || parsed.html?.toString(),
      fileName,
      fileSize,
      fileBuffer,
    };
  } catch (error) {
    console.error('Error parsing raw MIME email:', error);
    return null;
  }
}

// Parse inbound email from various email service providers
// files parameter contains attachments from multer when using multipart/form-data
async function parseInboundEmail(body: any, files?: Express.Multer.File[]): Promise<ParsedEmailData | null> {
  try {
    // Check for SendGrid raw MIME mode (when "POST the raw, full MIME message" is enabled)
    if (body.email && typeof body.email === 'string') {
      console.log('Detected raw MIME mode (body.email field present)');
      return await parseRawMimeEmail(body.email);
    }
    
    // Get first attachment from multer files if available (SendGrid multipart format)
    // SendGrid sends attachments with field names like "attachment1", "attachment2"
    const multerFile = files && files.length > 0 ? files[0] : null;
    
    // Debug: Log attachment info from SendGrid
    if (body['attachment-info']) {
      console.log('SendGrid attachment-info:', body['attachment-info']);
      try {
        const attachmentInfo = JSON.parse(body['attachment-info']);
        console.log('Parsed attachment info:', attachmentInfo);
      } catch (e) {
        console.log('Could not parse attachment-info');
      }
    }
    
    // Parse SendGrid attachment-info JSON to get file metadata
    let attachmentMeta: { name?: string; type?: string } | null = null;
    if (body['attachment-info']) {
      try {
        const info = JSON.parse(body['attachment-info']);
        // attachment-info is like {"attachment1": {"filename": "cert.pdf", "type": "application/pdf"}}
        const keys = Object.keys(info);
        if (keys.length > 0) {
          attachmentMeta = { 
            name: info[keys[0]]?.filename || info[keys[0]]?.name,
            type: info[keys[0]]?.type 
          };
          console.log('Extracted attachment metadata:', attachmentMeta);
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
    
    // SendGrid Inbound Parse format (supports both JSON and multipart)
    if (body.from && body.to) {
      return {
        from: extractEmailAddress(body.from) || body.from,
        fromName: extractEmailName(body.from),
        to: extractEmailAddress(body.to) || body.to,
        subject: body.subject,
        body: body.text || body.html,
        attachmentUrl: body.attachment_url || body.attachments?.[0]?.url,
        fileName: multerFile?.originalname || attachmentMeta?.name || body.attachments?.[0]?.filename || body.attachments?.[0]?.name,
        fileSize: multerFile?.size || body.attachments?.[0]?.size,
        fileBuffer: multerFile?.buffer,
      };
    }
    
    // Mailgun format
    if (body.sender && body.recipient) {
      return {
        from: body.sender,
        fromName: body['from-name'],
        to: body.recipient,
        subject: body.subject,
        body: body['body-plain'] || body['body-html'],
        attachmentUrl: body.attachments?.[0]?.url,
        fileName: multerFile?.originalname || body.attachments?.[0]?.name,
        fileSize: multerFile?.size || body.attachments?.[0]?.size,
        fileBuffer: multerFile?.buffer,
      };
    }
    
    // Postmark format
    if (body.From && body.To) {
      return {
        from: body.FromFull?.Email || body.From,
        fromName: body.FromFull?.Name,
        to: body.ToFull?.[0]?.Email || body.To,
        subject: body.Subject,
        body: body.TextBody || body.HtmlBody,
        attachmentUrl: body.Attachments?.[0]?.ContentID,
        fileName: multerFile?.originalname || body.Attachments?.[0]?.Name,
        fileSize: multerFile?.size || body.Attachments?.[0]?.ContentLength,
        fileBuffer: multerFile?.buffer,
      };
    }
    
    // Generic/test format
    if (body.senderEmail && body.recipientEmail) {
      return {
        from: body.senderEmail,
        fromName: body.senderName,
        to: body.recipientEmail,
        subject: body.subject,
        body: body.body,
        attachmentUrl: body.attachmentUrl,
        fileName: multerFile?.originalname || body.fileName,
        fileSize: multerFile?.size || body.fileSize,
        fileBuffer: multerFile?.buffer,
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing inbound email:', error);
    return null;
  }
}

// Extract email address from formatted string like "John Doe <john@example.com>"
function extractEmailAddress(emailString: string): string | null {
  const match = emailString.match(/<([^>]+)>/);
  return match ? match[1] : emailString.includes('@') ? emailString.trim() : null;
}

// Extract name from formatted string like "John Doe <john@example.com>"
function extractEmailName(emailString: string): string | undefined {
  const match = emailString.match(/^([^<]+)</);
  return match ? match[1].trim() : undefined;
}

// Extract property ID from email address format: property-{id}@...
function extractPropertyIdFromEmail(emailAddress: string): number | null {
  const match = emailAddress.match(/property-(\d+)@/i);
  return match ? parseInt(match[1], 10) : null;
}

// Detect certificate type from email subject or file name
function detectCertificateType(subject?: string, fileName?: string): string | null {
  const text = `${subject || ''} ${fileName || ''}`.toLowerCase();
  
  if (text.includes('smoke') || text.includes('alarm')) return 'smoke_alarm';
  if (text.includes('gas') || text.includes('combustion')) return 'gas_inspection';
  if (text.includes('electr') || text.includes('rcd') || text.includes('test tag')) return 'electrical_test_tag';
  if (text.includes('pool') || text.includes('spa')) return 'pool_compliance';
  if (text.includes('fire') || text.includes('extinguish')) return 'fire_safety';
  if (text.includes('pest') || text.includes('termite')) return 'pest_inspection';
  if (text.includes('asbestos')) return 'asbestos_inspection';
  if (text.includes('safety') || text.includes('compliance')) return 'safety_compliance';
  
  return null; // Unknown type - will need manual classification
}

// Health check endpoint for deployment platforms
export function setupHealthCheck(app: Express) {
  app.get("/api/health", (_req, res) => {
    res.status(200).json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    });
  });

}

// Helper function for automatic room generation
async function generateRoomsForProperty(property: any): Promise<any[]> {
  const rooms: any[] = [];
  const propertyId = property.id;
  const levels = property.numberOfLevels || 1;

  // Floor assignment logic based on number of levels
  // For multi-storey: bedrooms go upstairs, living areas on ground floor
  const groundFloor = 0;
  const firstFloor = levels >= 2 ? 1 : 0;
  const topFloor = Math.max(levels - 1, 0);

  // Generate bedrooms
  if (property.bedrooms && property.bedrooms > 0) {
    // Master bedroom: upstairs for multi-storey, ground for single
    rooms.push({
      propertyId,
      roomName: 'Master Bedroom',
      roomType: 'master_bedroom',
      floor: firstFloor,
      description: 'Primary bedroom with ensuite access'
    });

    // Distribute additional bedrooms across upper floors
    const upperFloors = [];
    for (let f = firstFloor; f <= topFloor; f++) upperFloors.push(f);
    if (upperFloors.length === 0) upperFloors.push(0);

    for (let i = 1; i < property.bedrooms; i++) {
      const bedroomFloor = upperFloors[i % upperFloors.length];
      rooms.push({
        propertyId,
        roomName: `Bedroom ${i}`,
        roomType: `bedroom_${i}`,
        floor: bedroomFloor,
        description: `Secondary bedroom ${i}`
      });
    }
  }

  // Generate bathrooms
  if (property.bathrooms && property.bathrooms > 0) {
    // Master ensuite follows master bedroom floor
    if (property.bedrooms && property.bedrooms > 0) {
      rooms.push({
        propertyId,
        roomName: 'Master Ensuite',
        roomType: 'master_ensuite',
        floor: firstFloor,
        description: 'Private bathroom attached to master bedroom'
      });
    }

    // Main bathroom on the same floor as bedrooms
    if (property.bathrooms > 1 || !property.bedrooms) {
      rooms.push({
        propertyId,
        roomName: 'Main Bathroom',
        roomType: 'main_bathroom',
        floor: firstFloor,
        description: 'Main shared bathroom'
      });
    }

    // Powder room always on ground floor (for guests)
    if (property.bathrooms >= 3) {
      rooms.push({
        propertyId,
        roomName: 'Powder Room',
        roomType: 'powder_room',
        floor: groundFloor,
        description: 'Guest powder room'
      });
    }
  }

  // Kitchen always on ground floor
  rooms.push({
    propertyId,
    roomName: 'Kitchen',
    roomType: 'kitchen',
    floor: groundFloor,
    description: 'Main kitchen and cooking area'
  });

  // Roof and gutters use special floor value
  rooms.push({
    propertyId,
    roomName: 'Roof',
    roomType: 'roof',
    floor: topFloor + 1,
    description: 'Property roof structure',
    materialType: 'tile'
  });

  rooms.push({
    propertyId,
    roomName: 'Gutters',
    roomType: 'gutters',
    floor: topFloor + 1,
    description: 'Gutter and drainage system'
  });

  // Create all rooms in the database
  try {
    const createdRooms = await Promise.all(
      rooms.map(async (roomData) => {
        const validatedData = insertPropertyRoomSchema.parse(roomData);
        return await storage.createPropertyRoom(validatedData);
      })
    );
    
    // Auto-generate standard inspection items for each room
    console.log(`Auto-generating standard inspection items for ${createdRooms.length} rooms`);
    for (const room of createdRooms) {
      try {
        await storage.generateStandardItemsForRoom(room, property.country || undefined);
        console.log(`Generated standard items for ${room.roomName} (${room.roomType}) using ${property.country || 'default'} standards`);
      } catch (error) {
        console.error(`Failed to generate standard items for room ${room.roomName}:`, error);
        // Continue with other rooms even if one fails
      }
    }
    
    return createdRooms;
  } catch (error) {
    console.error('Error creating rooms during property creation:', error);
    return [];
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint (must be first for deployment platforms)
  setupHealthCheck(app);
  
  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Compare password using bcrypt only - no plain text fallback for security
      const isValidPassword = await bcrypt.compare(password, user.password);

      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      if (!user.isActive) {
        return res.status(401).json({ message: "Account is disabled" });
      }

      // Create session for the user
      if (req.session) {
        req.session.userId = user.id;
      }

      // In a real app, you would generate and return a JWT token
      res.json({ 
        user: { 
          ...user, 
          password: undefined // Don't send password to client
        },
        token: `mock-token-${user.id}` // Mock token for development
      });
    } catch (error) {
      console.error('Login error:', error);
      if (error instanceof z.ZodError) {
        const fieldErrors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        return res.status(400).json({ 
          message: `Please check your login details: ${fieldErrors}`,
          errors: error.errors
        });
      }
      res.status(400).json({ message: "An error occurred. Please try again." });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = registerSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // Create new user with hashed password
      const { confirmPassword, ...userToCreate } = userData;
      const hashedPassword = await bcrypt.hash(userToCreate.password, 10);
      const newUser = await storage.createUser({
        ...userToCreate,
        password: hashedPassword
      });

      // Create session so user is logged in immediately after registration
      if (req.session) {
        req.session.userId = newUser.id;
      }

      res.status(201).json({ 
        user: { 
          ...newUser, 
          password: undefined 
        },
        token: `mock-token-${newUser.id}`
      });
    } catch (error: any) {
      console.error('Register error:', error);
      if (error instanceof z.ZodError) {
        const fieldErrors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        return res.status(400).json({ 
          message: `Validation failed: ${fieldErrors}`,
          errors: error.errors
        });
      }
      const detail = error?.message || String(error);
      res.status(400).json({ message: `Registration error: ${detail}` });
    }
  });

  // Send (or resend) email verification OTP
  app.post("/api/auth/send-verification", async (req, res) => {
    try {
      const { userId, email } = req.body;
      if (!userId || !email) return res.status(400).json({ message: "userId and email required" });

      const user = await storage.getUser(Number(userId));
      if (!user) return res.status(404).json({ message: "User not found" });
      if (user.emailVerified) return res.status(400).json({ message: "Email already verified" });

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      // Store token in DB
      const { db } = await import('./db');
      const { eq, and, isNull } = await import('drizzle-orm');
      // Invalidate any existing unused tokens for this user
      await db.update(emailVerificationTokens)
        .set({ usedAt: new Date() })
        .where(and(eq(emailVerificationTokens.userId, user.id), isNull(emailVerificationTokens.usedAt)));

      await db.insert(emailVerificationTokens).values({ userId: user.id, token: otp, expiresAt });

      // Send verification email
      const appUrl = process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'https://login.mymaintpro.com';
      try {
        const { sendEmail } = await import('./sendgrid');
        await sendEmail({
          to: user.email,
          subject: 'Your My Maintenance Pro verification code',
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
              <h2 style="color: #2196F3;">Verify your email</h2>
              <p>Hi ${user.firstName},</p>
              <p>Enter this code to verify your email address. It expires in 15 minutes.</p>
              <div style="background: #f0f7ff; border: 2px solid #2196F3; border-radius: 8px; padding: 24px; text-align: center; margin: 24px 0;">
                <span style="font-size: 40px; font-weight: bold; letter-spacing: 8px; color: #2196F3;">${otp}</span>
              </div>
              <p style="color: #666; font-size: 14px;">If you didn't create an account, you can ignore this email.</p>
            </div>
          `,
          text: `Your My Maintenance Pro verification code is: ${otp}. It expires in 15 minutes.`,
        });
        console.log(`Verification email sent to ${user.email}`);
      } catch (emailErr: any) {
        console.error('Failed to send verification email:', emailErr.message);
        // In dev, log the OTP so we can still test
        console.log(`[DEV] OTP for ${user.email}: ${otp}`);
      }

      res.json({ message: "Verification code sent", ...(process.env.NODE_ENV === 'development' ? { _devOtp: otp } : {}) });
    } catch (error: any) {
      console.error('Send verification error:', error);
      res.status(500).json({ message: "Failed to send verification code" });
    }
  });

  // Verify email with OTP
  app.post("/api/auth/verify-email", async (req, res) => {
    try {
      const { userId, token } = req.body;
      if (!userId || !token) return res.status(400).json({ message: "userId and token required" });

      const { db } = await import('./db');
      const { eq, and, isNull, gt } = await import('drizzle-orm');

      // Find a valid, unused, non-expired token
      const now = new Date();
      const [record] = await db.select()
        .from(emailVerificationTokens)
        .where(and(
          eq(emailVerificationTokens.userId, Number(userId)),
          eq(emailVerificationTokens.token, token),
          isNull(emailVerificationTokens.usedAt),
          gt(emailVerificationTokens.expiresAt, now)
        ))
        .limit(1);

      if (!record) {
        return res.status(400).json({ message: "Invalid or expired verification code" });
      }

      // Mark token as used and mark user as verified
      await db.update(emailVerificationTokens)
        .set({ usedAt: now })
        .where(eq(emailVerificationTokens.id, record.id));

      const updatedUser = await storage.updateUser(Number(userId), {
        emailVerified: true,
        emailVerifiedAt: now,
      });

      // Return updated user (excluding password)
      const { password: _, ...safeUser } = updatedUser as any;
      res.json({ message: "Email verified", user: safeUser });
    } catch (error: any) {
      console.error('Verify email error:', error);
      res.status(500).json({ message: "Verification failed" });
    }
  });

  app.post("/api/auth/signup", async (req, res) => {
    try {
      console.log('Signup request body:', JSON.stringify({
        ...req.body,
        password: req.body?.password ? '[REDACTED]' : undefined
      }));
      const userData = signupSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // If user doesn't have an agencyId (private/maintenance users), create a personal agency
      let finalAgencyId = userData.agencyId;
      if (!finalAgencyId) {
        const personalAgency = await storage.createAgency({
          name: `${userData.firstName} ${userData.lastName}${userData.userType === 'private' ? "'s Properties" : "'s Maintenance"}`,
          email: userData.email,
          isActive: true
        });
        finalAgencyId = personalAgency.id;
      }

      // Create new user with agencyId and hashed password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const newUser = await storage.createUser({
        ...userData,
        password: hashedPassword,
        agencyId: finalAgencyId
      });

      // Automatically log in the user by creating a session
      if (req.session) {
        req.session.userId = newUser.id;
      }

      res.status(201).json({ 
        user: { 
          ...newUser, 
          password: undefined 
        },
        token: `mock-token-${newUser.id}` // Mock token for development
      });
    } catch (error) {
      console.error('Signup error:', error);
      if (error instanceof z.ZodError) {
        const fieldErrors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        console.error('Validation errors:', fieldErrors);
        return res.status(400).json({ 
          message: `Validation failed: ${fieldErrors}`,
          errors: error.errors
        });
      }
      res.status(400).json({ message: "An error occurred during signup. Please try again." });
    }
  });

  // Forgot password endpoint - generates reset token and sends email
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = forgotPasswordSchema.parse(req.body);
      
      // Always return success to prevent user enumeration
      const user = await storage.getUserByEmail(email);
      if (!user || !user.isActive) {
        // Still return 200 to prevent email enumeration
        return res.status(200).json({ message: "If an account exists with that email, a password reset link has been sent." });
      }

      // Generate secure random token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = await bcrypt.hash(resetToken, 10);
      
      // Token expires in 1 hour
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      
      // Store hashed token in database
      await storage.createPasswordResetToken({
        userId: user.id,
        tokenHash,
        expiresAt,
        usedAt: null
      });

      // Generate reset URL
      const resetUrl = `${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'http://localhost:5000'}/reset-password?token=${resetToken}`;
      
      // Send password reset email
      await notificationService.sendPasswordResetEmail(user.email, user.firstName, resetUrl);
      
      res.status(200).json({ message: "If an account exists with that email, a password reset link has been sent." });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  // Reset password endpoint - validates token and updates password
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, password } = resetPasswordSchema.parse(req.body);
      
      // Get all valid (non-used, non-expired) reset tokens
      const allValidTokens = await storage.getAllValidResetTokens();
      
      // Find the token that matches the provided plain text token
      let validToken = null;
      for (const dbToken of allValidTokens) {
        const isMatch = await bcrypt.compare(token, dbToken.tokenHash);
        if (isMatch) {
          validToken = dbToken;
          break;
        }
      }
      
      if (!validToken) {
        return res.status(400).json({ message: "Invalid or expired reset token." });
      }
      
      // Get the user associated with this token
      const user = await storage.getUser(validToken.userId);
      if (!user) {
        return res.status(400).json({ message: "User not found." });
      }
      
      // Hash new password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Update user password
      await storage.updateUser(user.id, { password: hashedPassword });
      
      // Mark token as used
      await storage.markTokenAsUsed(validToken.id);
      
      // Destroy user's existing sessions for security
      if (req.session) {
        req.session.destroy(() => {});
      }
      
      res.status(200).json({ message: "Password has been reset successfully. You can now log in with your new password." });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.post("/api/auth/change-password", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters" });
      }
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const isValid = await bcrypt.compare(currentPassword, req.user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await storage.updateUser(req.user.id, { password: hashedPassword });
      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // Public agencies endpoint (needed for signup)
  app.get("/api/agencies", async (req, res) => {
    try {
      const agencies = await storage.getAllAgencies();
      res.json(agencies);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch agencies" });
    }
  });

  app.get("/api/agencies/:id", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const agency = await storage.getAgency(id);
      if (!agency) {
        return res.status(404).json({ message: "Agency not found" });
      }
      res.json(agency);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch agency" });
    }
  });

  app.post("/api/agencies", async (req, res) => {
    try {
      const agencyData = insertAgencySchema.parse(req.body);
      const newAgency = await storage.createAgency(agencyData);
      res.status(201).json(newAgency);
    } catch (error) {
      console.error('Agency creation error:', error);
      res.status(400).json({ message: "Invalid agency data" });
    }
  });

  // ============================================
  // PUBLIC WEBHOOK ENDPOINT FOR INBOUND EMAILS
  // ============================================
  // This endpoint receives emails from email services (SendGrid, Mailgun, Postmark, etc.)
  // Email format: property-{propertyId}@parse.mymaintpro.com
  // 
  // SECURITY: Requires webhook secret in header for authentication
  // Set WEBHOOK_SECRET environment variable and pass it as X-Webhook-Secret header
  // IMPORTANT: This must be registered BEFORE the global auth middleware below
  
  app.post("/api/webhooks/inbound-email", upload.any(), async (req: Request, res: Response) => {
    try {
      // Verify webhook secret for authentication (REQUIRED in production)
      const webhookSecret = process.env.WEBHOOK_SECRET;
      const providedSecret = req.headers['x-webhook-secret'] || req.query.secret;
      
      // In production, require the secret; in development, allow without for testing
      const isProduction = process.env.NODE_ENV === 'production';
      if (isProduction && !webhookSecret) {
        console.error('WEBHOOK_SECRET environment variable is not set in production');
        return res.status(503).json({ message: "Webhook not configured" });
      }
      
      if (webhookSecret && providedSecret !== webhookSecret) {
        console.warn('Unauthorized webhook attempt - invalid secret');
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      console.log('Received inbound email webhook, content-type:', req.headers['content-type']);
      console.log('Webhook body keys:', Object.keys(req.body));
      
      // Support multiple email service formats (SendGrid sends multipart/form-data)
      // Pass req.files (from multer) to handle attachments in multipart format
      const files = req.files as Express.Multer.File[] | undefined;
      console.log('Attachment files:', files?.length || 0, 'files received');
      const emailData = await parseInboundEmail(req.body, files);
      
      if (!emailData) {
        console.error('Failed to parse inbound email data');
        return res.status(400).json({ message: "Invalid email data format" });
      }
      
      // Validate sender email format
      if (!emailData.from || !emailData.from.includes('@')) {
        console.error('Invalid sender email:', emailData.from);
        return res.status(400).json({ message: "Invalid sender email" });
      }
      
      // Extract property ID from recipient email (format: property-{id}@...)
      const propertyId = extractPropertyIdFromEmail(emailData.to);
      
      if (!propertyId) {
        console.error('Could not extract property ID from email:', emailData.to);
        return res.status(400).json({ message: "Invalid recipient email format. Expected format: property-{id}@parse.mymaintpro.com" });
      }
      
      // Verify property exists and get agency ID
      const property = await storage.getPropertyById(propertyId);
      if (!property) {
        console.error('Property not found:', propertyId);
        return res.status(404).json({ message: "Property not found" });
      }
      
      // Sanitize input data
      const sanitizedSubject = (emailData.subject || 'Certificate Submission').substring(0, 500);
      const sanitizedSenderName = emailData.fromName ? emailData.fromName.substring(0, 100) : null;
      const sanitizedFileName = emailData.fileName ? emailData.fileName.substring(0, 255) : null;
      const sanitizedNotes = emailData.body ? `Email body: ${emailData.body.substring(0, 500)}` : null;
      
      // Only accept valid file URLs (basic validation)
      let sanitizedFileUrl = null;
      if (emailData.attachmentUrl) {
        try {
          const url = new URL(emailData.attachmentUrl);
          if (url.protocol === 'https:' || url.protocol === 'http:') {
            sanitizedFileUrl = emailData.attachmentUrl.substring(0, 2000);
          }
        } catch {
          console.warn('Invalid attachment URL, ignoring:', emailData.attachmentUrl);
        }
      }
      
      // Create certificate submission record
      const submission = await storage.createCertificateSubmission({
        propertyId: property.id,
        agencyId: property.agencyId,
        senderEmail: emailData.from.substring(0, 255),
        senderName: sanitizedSenderName,
        subject: sanitizedSubject,
        certificateType: detectCertificateType(emailData.subject, emailData.fileName),
        fileUrl: sanitizedFileUrl,
        fileName: sanitizedFileName,
        fileSize: emailData.fileSize && emailData.fileSize > 0 ? Math.min(emailData.fileSize, 100000000) : null,
        status: 'pending',
        notes: sanitizedNotes,
      });
      
      console.log('Created certificate submission:', submission.id, 'for property:', propertyId);
      
      // Use AI to parse certificate details - including PDF content extraction
      try {
        const aiParsed = await parseCertificateContent(
          sanitizedSubject,
          emailData.body || '',
          sanitizedFileName || undefined,
          emailData.fileBuffer // Pass PDF buffer for text extraction
        );
        
        console.log('AI parsed certificate:', aiParsed.certificateType, 'confidence:', aiParsed.confidence);
        
        // Update submission with AI-parsed details
        const aiNotes = [
          sanitizedNotes || '',
          `AI Parsed: Type=${aiParsed.certificateType}, Confidence=${(aiParsed.confidence * 100).toFixed(0)}%`,
          aiParsed.issuerName ? `Issuer: ${aiParsed.issuerName}` : null,
          aiParsed.certificateNumber ? `Cert#: ${aiParsed.certificateNumber}` : null,
          aiParsed.expiryDate ? `Expires: ${aiParsed.expiryDate}` : null,
          aiParsed.notes,
        ].filter(Boolean).join(' | ');
        
        // Validate address BEFORE linking inspection items
        const addressComparison = compareAddresses(property.address, aiParsed.propertyAddress);
        console.log('Address validation:', addressComparison.status, 'score:', addressComparison.overallScore);
        
        // Store address comparison results
        await storage.updateCertificateSubmission(submission.id, {
          certificateType: aiParsed.certificateType !== 'general' ? aiParsed.certificateType : submission.certificateType,
          extractedAddress: aiParsed.propertyAddress || null,
          addressMatchScore: addressComparison.overallScore,
          addressComparisonNotes: addressComparison.notes.join('; '),
          notes: aiNotes.substring(0, 1000),
          status: addressComparison.status === 'no_address' ? 'rejected_no_address' :
                  addressComparison.status === 'mismatch' ? 'rejected_address_mismatch' :
                  addressComparison.status === 'review' ? 'pending_address_review' :
                  aiParsed.confidence >= 0.7 ? 'processing' : 'pending',
        });
        
        // CHANGED: No longer auto-link items - always require manual review
        // Items will only be linked when status is manually set to 'processed'
        const passesAddressValidation = addressComparison.status === 'match' && aiParsed.confidence >= 0.5;
        
        if (passesAddressValidation) {
          // Count matching items for the review note but DON'T link them yet
          const itemsToUpdate = getCertificateInspectionItems(aiParsed.certificateType);
          let potentialMatchCount = 0;
          
          if (itemsToUpdate.length > 0) {
            const propertyRooms = await storage.getPropertyRooms(property.id);
            
            for (const room of propertyRooms) {
              const items = await storage.getInspectionItems(room.id);
              for (const item of items) {
                const itemNameLower = item.itemName.toLowerCase();
                const matches = itemsToUpdate.some(pattern => 
                  itemNameLower.includes(pattern.toLowerCase())
                );
                if (matches) {
                  potentialMatchCount++;
                }
              }
            }
          }
          
          const expiryDate = aiParsed.expiryDate 
            ? new Date(aiParsed.expiryDate) 
            : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
          
          // Set to pending_review status - requires manual approval before linking
          await storage.updateCertificateSubmission(submission.id, {
            status: 'pending_review',
            notes: `${aiParsed.certificateType.toUpperCase()} certificate - Address verified (${(addressComparison.overallScore * 100).toFixed(0)}% match). ${potentialMatchCount} inspection item(s) can be linked. Expires: ${expiryDate.toLocaleDateString()}. AWAITING MANUAL REVIEW.`,
          });
          console.log(`Certificate ready for review - ${potentialMatchCount} potential items to link`);
        } else {
          // Log the reason for non-approval - rejection statuses already set above and will NOT be overwritten
          console.log(`Certificate NOT auto-linked - reason: ${addressComparison.status}, score: ${addressComparison.overallScore}, notes: ${addressComparison.notes.join('; ')}`);
        }
      } catch (aiError) {
        console.error('AI parsing failed (non-critical):', aiError);
        // Continue without AI parsing - submission is already created
      }
      
      res.status(200).json({ 
        success: true, 
        submissionId: submission.id,
        message: "Certificate received and queued for processing" 
      });
    } catch (error) {
      console.error('Error processing inbound email webhook:', error);
      res.status(500).json({ message: "Failed to process email" });
    }
  });

  // Test email endpoint (for verifying SendGrid integration)
  app.post("/api/test-email", async (req: Request, res: Response) => {
    try {
      const { to, subject, body } = req.body;
      
      if (!to || !subject) {
        return res.status(400).json({ message: "Missing required fields: to, subject" });
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(to)) {
        return res.status(400).json({ message: "Invalid email format" });
      }
      
      await sendEmail({
        to,
        subject,
        text: body || 'This is a test email from My Maintenance Pro.',
        html: `<p>${body || 'This is a test email from My Maintenance Pro.'}</p>`,
      });
      
      res.status(200).json({ success: true, message: "Test email sent successfully" });
    } catch (error: any) {
      console.error('Test email error:', error);
      res.status(500).json({ 
        message: "Failed to send test email", 
        error: error.message || 'Unknown error'
      });
    }
  });

  // Public Stripe promo code validation (must be before auth middleware)
  app.post("/api/stripe/validate-promo", async (req, res) => {
    try {
      const { code } = req.body;
      if (!code) return res.status(400).json({ error: 'Code is required' });
      const { stripeService } = await import('./stripeService');
      const result = await stripeService.validatePromoCode(code);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Apply authentication middleware to all protected routes
  app.use("/api", authenticateUser);

  // User routes
  app.get("/api/user/me", (req: AuthenticatedRequest, res) => {
    res.json({ ...req.user, password: undefined });
  });

  // TOS acceptance endpoint
  app.post("/api/user/accept-tos", async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.id;
      
      // Update user's TOS acceptance
      await storage.updateUser(userId, {
        tosAccepted: true,
        tosAcceptedAt: new Date()
      });
      
      // Fetch updated user
      const updatedUser = await storage.getUser(userId);
      
      res.json({ 
        ...updatedUser, 
        password: undefined 
      });
    } catch (error) {
      console.error('TOS acceptance error:', error);
      res.status(500).json({ message: "Failed to accept terms of service" });
    }
  });

  // Onboarding state endpoints
  app.patch("/api/user/onboarding", async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.id;
      const { currentStep, completed, dismissed, completedSteps, setupTasks } = req.body;
      
      // Get current onboarding state
      const user = await storage.getUser(userId);
      const currentState = user?.onboardingState || {
        currentStep: 0,
        completed: false,
        dismissed: false,
        completedAt: null,
        completedSteps: [],
        setupTasks: {
          agencyBranding: false,
          firstProperty: false,
          firstRoom: false,
          firstInspection: false,
        }
      };
      
      // Merge updates
      const newState = {
        ...currentState,
        ...(currentStep !== undefined && { currentStep }),
        ...(completed !== undefined && { completed }),
        ...(dismissed !== undefined && { dismissed }),
        ...(completedSteps && { completedSteps }),
        ...(setupTasks && { setupTasks: { ...currentState.setupTasks, ...setupTasks } }),
        ...(completed && { completedAt: new Date().toISOString() }),
      };
      
      await storage.updateUser(userId, { onboardingState: newState });
      const updatedUser = await storage.getUser(userId);
      
      res.json({ 
        ...updatedUser, 
        password: undefined 
      });
    } catch (error) {
      console.error('Onboarding update error:', error);
      res.status(500).json({ message: "Failed to update onboarding state" });
    }
  });

  app.post("/api/user/onboarding/restart", async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.id;
      
      // Reset onboarding state
      const newState = {
        currentStep: 0,
        completed: false,
        dismissed: false,
        completedAt: null,
        completedSteps: [],
        setupTasks: {
          agencyBranding: false,
          firstProperty: false,
          firstRoom: false,
          firstInspection: false,
        }
      };
      
      await storage.updateUser(userId, { onboardingState: newState });
      const updatedUser = await storage.getUser(userId);
      
      res.json({ 
        ...updatedUser, 
        password: undefined 
      });
    } catch (error) {
      console.error('Onboarding restart error:', error);
      res.status(500).json({ message: "Failed to restart onboarding" });
    }
  });

  // Admin routes - require super_admin role (app owner only)
  app.get("/api/admin/users", requireRole(['super_admin']), async (req: AuthenticatedRequest, res) => {
    try {
      const { userType, isActive } = req.query;
      
      let allUsers = await storage.getAllUsers();
      
      // Filter by userType if provided
      if (userType && typeof userType === 'string') {
        allUsers = allUsers.filter(user => user.userType === userType);
      }
      
      // Filter by isActive if provided
      if (isActive !== undefined) {
        const activeFilter = isActive === 'true';
        allUsers = allUsers.filter(user => user.isActive === activeFilter);
      }
      
      // Remove passwords from response
      const usersWithoutPasswords = allUsers.map(user => ({
        ...user,
        password: undefined
      }));
      
      res.json(usersWithoutPasswords);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch("/api/admin/users/:id/toggle-active", requireRole(['super_admin']), async (req: AuthenticatedRequest, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Prevent users from deactivating themselves
      if (user.id === req.user?.id) {
        return res.status(400).json({ message: "Cannot deactivate your own account" });
      }
      
      const updatedUser = await storage.updateUser(userId, {
        isActive: !user.isActive
      });
      
      res.json({
        ...updatedUser,
        password: undefined
      });
    } catch (error) {
      console.error('Error toggling user status:', error);
      res.status(500).json({ message: "Failed to update user status" });
    }
  });

  // Audit and fix inspection intervals for all items across all countries
  app.post("/api/admin/audit-inspection-intervals", requireRole(['super_admin']), async (req: AuthenticatedRequest, res) => {
    try {
      console.log('Starting inspection interval audit...');
      const result = await storage.auditAndFixInspectionIntervals();
      res.json({
        success: true,
        message: `Audit complete: Fixed ${result.itemsFixed}/${result.totalItems} items`,
        ...result
      });
    } catch (error) {
      console.error('Error during inspection interval audit:', error);
      res.status(500).json({ message: "Failed to audit inspection intervals" });
    }
  });

  // Dashboard metrics
  app.get("/api/dashboard/metrics/:agencyId", requireAgencyAccess, async (req: AuthenticatedRequest, res) => {
    try {
      const agencyId = parseInt(req.params.agencyId);
      
      const [properties, tasks, users, overdueTasks] = await Promise.all([
        storage.getPropertiesByAgency(agencyId),
        storage.getMaintenanceTasksByAgency(agencyId),
        storage.getUsersByAgency(agencyId),
        storage.getOverdueTasks(agencyId)
      ]);

      const activeTasks = tasks.filter(task => 
        ['scheduled', 'pending', 'in_progress'].includes(task.status)
      );

      const completedTasks = tasks.filter(task => task.status === 'completed');
      const totalTasks = tasks.length;
      const complianceRate = totalTasks > 0 ? (completedTasks.length / totalTasks) * 100 : 100;

      // Calculate inspection metrics
      const today = new Date();
      const weekFromToday = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      const overdueInspections = properties.filter(property => 
        property.nextInspectionDate && new Date(property.nextInspectionDate) < today
      ).length;
      
      const upcomingInspections = properties.filter(property => 
        property.nextInspectionDate && 
        new Date(property.nextInspectionDate) >= today &&
        new Date(property.nextInspectionDate) <= weekFromToday
      ).length;

      const metrics = {
        totalProperties: properties.length,
        activeTasks: activeTasks.length,
        overdueTasks: overdueTasks.length,
        managers: users.filter(user => user.role === 'property_manager').length,
        complianceRate: Math.round(complianceRate * 10) / 10,
        overdueInspections,
        upcomingInspections,
      };

      res.json(metrics);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard metrics" });
    }
  });

  // Compliance insights endpoint - optimized with batch queries and portfolio-level aggregation
  app.get("/api/dashboard/compliance-insights/:agencyId", requireAgencyAccess, async (req: AuthenticatedRequest, res) => {
    try {
      const agencyId = parseInt(req.params.agencyId);
      
      const properties = await storage.getPropertiesByAgency(agencyId);
      const today = new Date();
      const weekFromToday = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      // Get portfolio-level compliance data (aggregates ALL inspection items across all properties)
      const portfolioData = await storage.getPortfolioComplianceData(agencyId);
      
      // Batch fetch inspection ratios for all properties at once (optimized)
      const inspectionRatios = await storage.getPropertyInspectionRatios(agencyId);
      const ratiosMap = new Map(inspectionRatios.map(r => [r.propertyId, r]));
      
      // Calculate compliance data using batch results (for property-level breakdown)
      const propertyComplianceData = properties.map((property) => {
        const ratioData = ratiosMap.get(property.id);
        const totalItems = ratioData?.totalCount || 0;
        const completedItems = ratioData?.completedCount || 0;
        const completionRate = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
        
        // Determine property status - only 'compliant' if truly compliant
        let status: 'overdue' | 'due_soon' | 'compliant' = 'due_soon'; // Default to needing attention
        let overdueItems = totalItems - completedItems;
        
        // Check if property has a next inspection date
        if (property.nextInspectionDate) {
          const inspectionDate = new Date(property.nextInspectionDate);
          if (inspectionDate < today) {
            // Past due - overdue
            status = 'overdue';
          } else if (inspectionDate <= weekFromToday) {
            // Due within a week
            status = 'due_soon';
          } else if (completionRate === 100) {
            // Future inspection AND all items complete - truly compliant
            status = 'compliant';
            overdueItems = 0;
          } else {
            // Future inspection but items not complete - needs attention
            status = 'due_soon';
          }
        } else {
          // No next inspection date set
          if (totalItems === 0) {
            // No inspection items configured - needs setup
            status = 'due_soon';
          } else if (completedItems < totalItems) {
            // Has items but not all complete and no schedule - overdue
            status = 'overdue';
          } else {
            // All items complete but no next date scheduled - needs scheduling (due_soon)
            status = 'due_soon';
          }
        }
        
        return {
          id: property.id,
          name: property.name,
          address: property.address,
          status,
          nextInspectionDate: property.nextInspectionDate,
          completionRate,
          overdueItems: Math.max(0, overdueItems),
          totalItems,
          notInspectedItems: ratioData?.notInspectedCount || 0,
        };
      });
      
      const overdue = propertyComplianceData.filter(p => p.status === 'overdue');
      const dueSoon = propertyComplianceData.filter(p => p.status === 'due_soon');
      const compliant = propertyComplianceData.filter(p => p.status === 'compliant');
      
      res.json({
        overdue,
        dueSoon,
        compliant,
        totalProperties: properties.length,
        // Portfolio-level compliance based on actual inspection items
        overallComplianceRate: portfolioData.overallComplianceRate,
        // Portfolio aggregation data
        portfolio: {
          totalItems: portfolioData.totalItems,
          completedItems: portfolioData.completedItems,
          overdueItems: portfolioData.overdueItems,
          dueSoonItems: portfolioData.dueSoonItems,
          compliantItems: portfolioData.compliantItems,
          notApplicableItems: portfolioData.notApplicableItems,
          notInspectedItems: portfolioData.notInspectedItems,
        }
      });
    } catch (error) {
      console.error('Error fetching compliance insights:', error);
      res.status(500).json({ message: "Failed to fetch compliance insights" });
    }
  });

  // Property Templates routes
  app.get("/api/property-templates", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const templates = await storage.getPropertyTemplates(req.user!.agencyId);
      res.json(templates);
    } catch (error) {
      console.error('Error fetching property templates:', error);
      res.status(500).json({ message: "Failed to fetch property templates" });
    }
  });

  app.get("/api/property-templates/:id", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const templateId = parseInt(req.params.id);
      const template = await storage.getPropertyTemplate(templateId);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error('Error fetching property template:', error);
      res.status(500).json({ message: "Failed to fetch property template" });
    }
  });

  app.post("/api/properties/from-template", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { templateId, ...propertyData } = req.body;
      
      if (!templateId) {
        return res.status(400).json({ message: "Template ID is required" });
      }

      // Ensure user has access to create properties for this agency
      if (req.user!.agencyId !== propertyData.agencyId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const parsedPropertyData = insertPropertySchema.parse(propertyData);
      const property = await storage.createPropertyFromTemplate(templateId, parsedPropertyData);
      res.status(201).json(property);
    } catch (error) {
      console.error('Error creating property from template:', error);
      if (error instanceof Error && error.message === 'Template not found') {
        return res.status(404).json({ message: "Template not found" });
      }
      res.status(500).json({ message: "Failed to create property from template" });
    }
  });

  // Properties routes
  app.get("/api/properties/:agencyId", requireAgencyAccess, async (req: AuthenticatedRequest, res) => {
    try {
      const agencyId = parseInt(req.params.agencyId);
      const properties = await storage.getPropertiesByAgency(agencyId);
      res.json(properties);
    } catch (error) {
      console.error('Error fetching properties:', error);
      res.status(500).json({ message: "Failed to fetch properties" });
    }
  });

  // Get single property by ID
  app.get("/api/properties/single/:id", async (req: AuthenticatedRequest, res) => {
    try {
      const propertyId = parseInt(req.params.id);
      const property = await storage.getProperty(propertyId);
      
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }

      // Ensure user has access to this property
      if (req.user!.agencyId !== property.agencyId) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(property);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch property" });
    }
  });

  app.post("/api/properties", async (req: AuthenticatedRequest, res) => {
    try {
      const propertyData = insertPropertySchema.parse(req.body);
      
      // Ensure user has access to create properties for this agency
      if (req.user!.agencyId !== propertyData.agencyId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Auto-detect country from address if not provided
      if (!propertyData.country && propertyData.address) {
        propertyData.country = detectCountryFromAddress(propertyData.address);
        console.log(`Auto-detected country: ${propertyData.country} from address: ${propertyData.address}`);
      }

      const newProperty = await storage.createProperty(propertyData);
      
      // Automatically generate rooms if property has bedrooms or bathrooms
      if ((newProperty.bedrooms && newProperty.bedrooms > 0) || (newProperty.bathrooms && newProperty.bathrooms > 0)) {
        try {
          console.log(`Attempting to auto-generate rooms for property ${newProperty.name} (${newProperty.bedrooms} bed, ${newProperty.bathrooms} bath)`);
          const generatedRooms = await generateRoomsForProperty(newProperty);
          console.log(`Auto-generated ${generatedRooms.length} rooms for property ${newProperty.name}`);
        } catch (error) {
          console.error('Failed to auto-generate rooms for new property:', error);
          // Don't fail the property creation if room generation fails
        }
      } else {
        console.log(`No rooms to auto-generate for property ${newProperty.name} (${newProperty.bedrooms} bed, ${newProperty.bathrooms} bath)`);
      }
      
      // Log activity
      await storage.createActivityLog({
        agencyId: propertyData.agencyId,
        userId: req.user!.id,
        action: 'created',
        entityType: 'property',
        entityId: newProperty.id,
        details: { propertyName: newProperty.name },
      });

      res.status(201).json(newProperty);
    } catch (error) {
      console.error('Property creation validation error:', error);
      console.error('Request body:', req.body);
      res.status(400).json({ message: "Invalid property data", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Update property
  app.patch("/api/properties/:id", async (req: AuthenticatedRequest, res) => {
    try {
      const propertyId = parseInt(req.params.id);
      const updates = insertPropertySchema.partial().parse(req.body);
      
      const existingProperty = await storage.getProperty(propertyId);
      if (!existingProperty) {
        return res.status(404).json({ message: "Property not found" });
      }

      // Ensure user has access to update this property
      if (req.user!.agencyId !== existingProperty.agencyId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Auto-detect country if address is being updated
      if (updates.address && !updates.country) {
        updates.country = detectCountryFromAddress(updates.address);
        console.log(`Auto-detected country change: ${updates.country} from updated address: ${updates.address}`);
      }

      const updatedProperty = await storage.updateProperty(propertyId, updates);
      
      if (!updatedProperty) {
        return res.status(500).json({ message: "Failed to update property" });
      }
      
      // Log activity
      await storage.createActivityLog({
        agencyId: existingProperty.agencyId,
        userId: req.user!.id,
        action: 'updated',
        entityType: 'property',
        entityId: propertyId,
        details: { changes: updates, propertyName: updatedProperty.name },
      });

      res.json(updatedProperty);
    } catch (error) {
      res.status(400).json({ message: "Invalid property data" });
    }
  });

  // Delete property
  app.delete("/api/properties/:id", async (req: AuthenticatedRequest, res) => {
    try {
      const propertyId = parseInt(req.params.id);

      // Get the property to check ownership and get details for logging
      const existingProperty = await storage.getProperty(propertyId);
      if (!existingProperty) {
        return res.status(404).json({ message: "Property not found" });
      }

      // Ensure user has access to delete this property
      if (req.user!.agencyId !== existingProperty.agencyId) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteProperty(propertyId);
      
      // Log activity
      await storage.createActivityLog({
        agencyId: existingProperty.agencyId,
        userId: req.user!.id,
        action: 'deleted',
        entityType: 'property',
        entityId: propertyId,
        details: { propertyName: existingProperty.name || existingProperty.address },
      });

      res.json({ message: "Property deleted successfully" });
    } catch (error) {
      console.error('Error deleting property:', error);
      res.status(500).json({ message: "Failed to delete property" });
    }
  });

  // Send inspection report email
  app.post("/api/properties/:id/send-inspection-report", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const propertyId = parseInt(req.params.id);

      // Get the property
      const property = await storage.getProperty(propertyId);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }

      // Ensure user has access to this property
      if (req.user!.agencyId !== property.agencyId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get the agency
      const agency = await storage.getAgency(property.agencyId);
      if (!agency) {
        return res.status(404).json({ message: "Agency not found" });
      }

      // Get all inspection items for this property
      const inspectionItems = await storage.getAllInspectionItemsForProperty(propertyId);
      
      if (!inspectionItems || inspectionItems.length === 0) {
        return res.status(400).json({ message: "No inspection items found for this property" });
      }

      // Build recipients list from property.reportRecipients
      const recipients: string[] = [];
      const reportRecipients = property.reportRecipients as any;

      if (reportRecipients) {
        // Add owner email if requested
        if (reportRecipients.ownerEmail && property.ownerId) {
          const owner = await storage.getUser(property.ownerId);
          if (owner?.email) {
            recipients.push(owner.email);
          }
        }

        // Add manager email if requested
        if (reportRecipients.managerEmail && property.managerId) {
          const manager = await storage.getUser(property.managerId);
          if (manager?.email) {
            recipients.push(manager.email);
          }
        }

        // Add additional emails
        if (reportRecipients.additionalEmails && Array.isArray(reportRecipients.additionalEmails)) {
          recipients.push(...reportRecipients.additionalEmails);
        }
      }

      // Remove duplicates
      const uniqueRecipients = Array.from(new Set(recipients));

      if (uniqueRecipients.length === 0) {
        return res.status(400).json({ message: "No recipients configured for this property" });
      }

      // Send the inspection report email
      const success = await notificationService.sendInspectionReport(
        agency,
        property,
        inspectionItems,
        uniqueRecipients
      );

      if (!success) {
        return res.status(500).json({ message: "Failed to send inspection report" });
      }

      // Log activity
      await storage.createActivityLog({
        agencyId: property.agencyId,
        userId: req.user!.id,
        action: 'sent_inspection_report',
        entityType: 'property',
        entityId: propertyId,
        details: { 
          propertyName: property.name,
          recipientCount: uniqueRecipients.length
        },
      });

      res.json({ 
        message: "Inspection report sent successfully",
        recipientCount: uniqueRecipients.length,
        recipients: uniqueRecipients
      });
    } catch (error) {
      console.error('Error sending inspection report:', error);
      res.status(500).json({ message: "Failed to send inspection report" });
    }
  });

  // Mark all uninspected items as baseline (sets today's date and Good condition)
  app.post("/api/properties/:id/mark-baseline", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const propertyId = parseInt(req.params.id);

      // Get the property
      const property = await storage.getProperty(propertyId);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }

      // Ensure user has access to this property
      if (req.user!.agencyId !== property.agencyId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get all inspection items for this property
      const inspectionItems = await storage.getAllInspectionItemsForProperty(propertyId);
      
      if (!inspectionItems || inspectionItems.length === 0) {
        return res.status(400).json({ message: "No inspection items found for this property" });
      }

      // Filter to uninspected items only
      const uninspectedItems = inspectionItems.filter(item => 
        !item.lastInspectedDate && !item.isNotApplicable
      );

      if (uninspectedItems.length === 0) {
        return res.status(400).json({ message: "All items have already been inspected" });
      }

      const now = new Date();
      let updatedCount = 0;

      // Update each uninspected item and create history snapshots
      for (const item of uninspectedItems) {
        // Update the inspection item
        await storage.updateInspectionItem(item.id, {
          lastInspectedDate: now,
          condition: 'good',
          notes: 'Baseline set - initial property assessment'
        });
        
        // Create inspection history snapshot for audit trail
        await storage.createInspectionItemSnapshot({
          inspectionItemId: item.id,
          inspectedById: req.user!.id,
          inspectedAt: now,
          condition: 'good',
          notes: 'Baseline set - initial property assessment',
          previousCondition: null,
          deteriorationSeverity: 'none'
        });
        
        updatedCount++;
      }

      // Log activity
      await storage.createActivityLog({
        agencyId: property.agencyId,
        userId: req.user!.id,
        action: 'marked_baseline',
        entityType: 'property',
        entityId: propertyId,
        details: { 
          propertyName: property.name,
          itemsUpdated: updatedCount
        },
      });

      res.json({ 
        message: "Baseline set successfully",
        itemsUpdated: updatedCount
      });
    } catch (error) {
      console.error('Error setting baseline:', error);
      res.status(500).json({ message: "Failed to set baseline" });
    }
  });

  // Maintenance tasks routes
  app.get("/api/maintenance-tasks/:agencyId", requireAgencyAccess, async (req: AuthenticatedRequest, res) => {
    try {
      const agencyId = parseInt(req.params.agencyId);
      const tasks = await storage.getMaintenanceTasksByAgency(agencyId);
      
      // Include property and assignee details
      const tasksWithDetails = await Promise.all(
        tasks.map(async (task) => {
          const property = await storage.getProperty(task.propertyId);
          const assignee = task.assignedTo ? await storage.getUser(task.assignedTo) : null;
          
          return {
            ...task,
            property,
            assignee: assignee ? { 
              id: assignee.id, 
              firstName: assignee.firstName, 
              lastName: assignee.lastName,
              initials: `${assignee.firstName[0]}${assignee.lastName[0]}`
            } : null
          };
        })
      );

      res.json(tasksWithDetails);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch maintenance tasks" });
    }
  });

  app.get("/api/maintenance-tasks/upcoming/:agencyId", requireAgencyAccess, async (req: AuthenticatedRequest, res) => {
    try {
      const agencyId = parseInt(req.params.agencyId);
      const days = parseInt(req.query.days as string) || 30;
      
      const tasks = await storage.getUpcomingTasks(agencyId, days);
      
      // Include property and assignee details
      const tasksWithDetails = await Promise.all(
        tasks.map(async (task) => {
          const property = await storage.getProperty(task.propertyId);
          const assignee = task.assignedTo ? await storage.getUser(task.assignedTo) : null;
          
          return {
            ...task,
            property,
            assignee: assignee ? { 
              id: assignee.id, 
              firstName: assignee.firstName, 
              lastName: assignee.lastName,
              initials: `${assignee.firstName[0]}${assignee.lastName[0]}`
            } : null
          };
        })
      );

      res.json(tasksWithDetails);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch upcoming tasks" });
    }
  });

  // Get maintenance tasks for a specific property
  app.get("/api/maintenance-tasks/property/:propertyId", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      
      // Verify user has access to this property
      const property = await storage.getProperty(propertyId);
      if (!property || property.agencyId !== req.user!.agencyId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const tasks = await storage.getMaintenanceTasksByProperty(propertyId);
      
      // Include assignee details
      const tasksWithDetails = await Promise.all(
        tasks.map(async (task) => {
          const assignee = task.assignedTo ? await storage.getUser(task.assignedTo) : null;
          
          return {
            ...task,
            property,
            assignee: assignee ? { 
              id: assignee.id, 
              firstName: assignee.firstName, 
              lastName: assignee.lastName,
              initials: `${assignee.firstName[0]}${assignee.lastName[0]}`
            } : null
          };
        })
      );

      res.json(tasksWithDetails);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch property tasks" });
    }
  });

  app.post("/api/maintenance-tasks", async (req: AuthenticatedRequest, res) => {
    try {
      const taskData = insertMaintenanceTaskSchema.parse(req.body);
      
      // Ensure user has access to create tasks for this agency
      if (req.user!.agencyId !== taskData.agencyId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const newTask = await storage.createMaintenanceTask(taskData);
      
      // Schedule notifications
      await notificationService.scheduleNotificationsForTask(newTask.id);

      // Log activity
      await storage.createActivityLog({
        agencyId: taskData.agencyId,
        userId: req.user!.id,
        action: 'created',
        entityType: 'task',
        entityId: newTask.id,
        details: { taskTitle: newTask.title },
      });

      res.status(201).json(newTask);
    } catch (error) {
      res.status(400).json({ message: "Invalid task data" });
    }
  });

  app.patch("/api/maintenance-tasks/:id", async (req: AuthenticatedRequest, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const updates = req.body;
      
      const existingTask = await storage.getMaintenanceTask(taskId);
      if (!existingTask) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Ensure user has access to update this task
      if (req.user!.agencyId !== existingTask.agencyId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updatedTask = await storage.updateMaintenanceTask(taskId, updates);
      
      // If task was completed, send completion notice
      if (updates.status === 'completed' && existingTask.status !== 'completed') {
        await notificationService.sendTaskCompletionNotice(taskId);
      }

      // Log activity
      await storage.createActivityLog({
        agencyId: existingTask.agencyId,
        userId: req.user!.id,
        action: 'updated',
        entityType: 'task',
        entityId: taskId,
        details: { changes: updates },
      });

      res.json(updatedTask);
    } catch (error) {
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  // Maintenance templates routes
  app.get("/api/maintenance-templates/:agencyId", requireAgencyAccess, async (req: AuthenticatedRequest, res) => {
    try {
      const agencyId = parseInt(req.params.agencyId);
      const templates = await storage.getMaintenanceTemplatesByAgency(agencyId);
      res.json(templates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch maintenance templates" });
    }
  });

  app.post("/api/maintenance-templates", async (req: AuthenticatedRequest, res) => {
    try {
      const templateData = insertMaintenanceTemplateSchema.parse(req.body);
      
      // Ensure user has access to create templates for this agency
      if (req.user!.agencyId !== templateData.agencyId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const newTemplate = await storage.createMaintenanceTemplate(templateData);
      res.status(201).json(newTemplate);
    } catch (error) {
      res.status(400).json({ message: "Invalid template data" });
    }
  });

  // Contractors / Service Providers routes
  app.get("/api/contractors/:agencyId", requireAgencyAccess, async (req: AuthenticatedRequest, res) => {
    try {
      const agencyId = parseInt(req.params.agencyId);
      const contractors = await storage.getServiceProvidersByAgency(agencyId);
      res.json(contractors);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch contractors" });
    }
  });

  app.get("/api/contractors/property/:propertyId", async (req: AuthenticatedRequest, res) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      const property = await storage.getProperty(propertyId);
      
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      
      // Get contractors available for this property (property-specific + agency-wide)
      const contractors = await storage.getContractorsForProperty(propertyId, property.agencyId);
      res.json(contractors);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch contractors for property" });
    }
  });

  app.get("/api/contractors/trade/:agencyId/:tradeCategory", requireAgencyAccess, async (req: AuthenticatedRequest, res) => {
    try {
      const agencyId = parseInt(req.params.agencyId);
      const tradeCategory = req.params.tradeCategory;
      const contractors = await storage.getServiceProvidersByTrade(agencyId, tradeCategory);
      res.json(contractors);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch contractors by trade" });
    }
  });

  app.post("/api/contractors", async (req: AuthenticatedRequest, res) => {
    try {
      const contractorData = insertServiceProviderSchema.parse(req.body);
      
      // Ensure user has access to create contractors for this agency
      if (req.user!.agencyId !== contractorData.agencyId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const newContractor = await storage.createServiceProvider(contractorData);
      
      // Log activity
      await storage.createActivityLog({
        agencyId: contractorData.agencyId,
        userId: req.user!.id,
        action: 'created',
        entityType: 'contractor',
        entityId: newContractor.id,
        details: { name: newContractor.name, trade: newContractor.tradeCategory },
      });

      res.status(201).json(newContractor);
    } catch (error) {
      console.error('Error creating contractor:', error);
      res.status(400).json({ message: "Invalid contractor data" });
    }
  });

  app.patch("/api/contractors/:id", async (req: AuthenticatedRequest, res) => {
    try {
      const contractorId = parseInt(req.params.id);
      const existingContractor = await storage.getServiceProvider(contractorId);
      
      if (!existingContractor) {
        return res.status(404).json({ message: "Contractor not found" });
      }

      if (req.user!.agencyId !== existingContractor.agencyId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updatedContractor = await storage.updateServiceProvider(contractorId, req.body);
      res.json(updatedContractor);
    } catch (error) {
      res.status(500).json({ message: "Failed to update contractor" });
    }
  });

  app.delete("/api/contractors/:id", async (req: AuthenticatedRequest, res) => {
    try {
      const contractorId = parseInt(req.params.id);
      const existingContractor = await storage.getServiceProvider(contractorId);
      
      if (!existingContractor) {
        return res.status(404).json({ message: "Contractor not found" });
      }

      if (req.user!.agencyId !== existingContractor.agencyId) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteServiceProvider(contractorId);
      
      // Log activity
      await storage.createActivityLog({
        agencyId: existingContractor.agencyId,
        userId: req.user!.id,
        action: 'deleted',
        entityType: 'contractor',
        entityId: contractorId,
        details: { name: existingContractor.name },
      });

      res.json({ message: "Contractor deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete contractor" });
    }
  });

  // Activity logs
  app.get("/api/activity/:agencyId", requireAgencyAccess, async (req: AuthenticatedRequest, res) => {
    try {
      const agencyId = parseInt(req.params.agencyId);
      const limit = parseInt(req.query.limit as string) || 10;
      
      const activities = await storage.getRecentActivity(agencyId, limit);
      
      // Include user details for activities
      const activitiesWithDetails = await Promise.all(
        activities.map(async (activity) => {
          const user = await storage.getUser(activity.userId);
          return {
            ...activity,
            user: user ? {
              firstName: user.firstName,
              lastName: user.lastName
            } : null
          };
        })
      );

      res.json(activitiesWithDetails);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch activity logs" });
    }
  });

  // Notification routes
  app.post("/api/notifications/send-reminders/:agencyId", requireAgencyAccess, async (req: AuthenticatedRequest, res) => {
    try {
      const agencyId = parseInt(req.params.agencyId);
      await notificationService.processPendingNotifications(agencyId);
      res.json({ message: "Notifications processed" });
    } catch (error) {
      res.status(500).json({ message: "Failed to process notifications" });
    }
  });

  app.get("/api/notifications/due-inspections/:agencyId", requireAgencyAccess, async (req: AuthenticatedRequest, res) => {
    try {
      const agencyId = parseInt(req.params.agencyId);
      const counts = await storage.getDueInspectionItemsCount(agencyId);
      res.json(counts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch due inspections count" });
    }
  });

  app.get("/api/notifications/:agencyId", requireAgencyAccess, async (req: AuthenticatedRequest, res) => {
    try {
      const agencyId = parseInt(req.params.agencyId);
      const notifications = await storage.getNotificationLogsByAgency(agencyId);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.get("/api/rooms/agency/:agencyId", requireAgencyAccess, async (req: AuthenticatedRequest, res) => {
    try {
      const agencyId = parseInt(req.params.agencyId);
      const properties = await storage.getPropertiesByAgency(agencyId);
      const allRooms = [];
      for (const property of properties) {
        const rooms = await storage.getPropertyRooms(property.id);
        allRooms.push(...rooms);
      }
      res.json(allRooms);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch agency rooms" });
    }
  });

  // Property Room routes
  app.get("/api/properties/:propertyId/rooms", async (req: AuthenticatedRequest, res) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      const rooms = await storage.getPropertyRooms(propertyId);
      res.json(rooms);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch property rooms" });
    }
  });

  app.post("/api/properties/:propertyId/rooms", async (req: AuthenticatedRequest, res) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      console.log('Adding room to property:', propertyId, 'Data:', req.body);
      
      if (isNaN(propertyId)) {
        return res.status(400).json({ message: "Invalid property ID" });
      }
      
      let roomData = insertPropertyRoomSchema.parse({
        ...req.body,
        propertyId
      });
      
      // Check for duplicate room names and append numbers if needed
      const existingRooms = await storage.getPropertyRooms(propertyId);
      const baseName = roomData.roomName;
      let finalName = baseName;
      let counter = 1;
      
      // Check if the room name already exists
      while (existingRooms.some(room => room.roomName === finalName)) {
        finalName = `${baseName} ${counter}`;
        counter++;
      }
      
      // Update the room name if it was changed
      if (finalName !== baseName) {
        roomData = { ...roomData, roomName: finalName };
        console.log(`Room name changed from "${baseName}" to "${finalName}" to avoid duplicates`);
      }
      
      const room = await storage.createPropertyRoom(roomData);
      console.log('Room created successfully:', room);
      
      // Automatically generate inspection items based on room type
      try {
        const inspectionItems = await storage.createBulkInspectionItems(room.id, room.roomType, room.floor);
      } catch (inspectionError) {
        console.error('Failed to auto-generate inspection items:', inspectionError);
        // Don't fail the room creation if inspection items fail
      }
      
      res.status(201).json(room);
    } catch (error) {
      console.error('Error creating room:', error);
      res.status(400).json({ message: "Invalid room data", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Bulk create multiple rooms with their inspection items
  app.post("/api/properties/:propertyId/rooms/bulk", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      
      if (isNaN(propertyId)) {
        return res.status(400).json({ message: "Invalid property ID" });
      }

      const property = await storage.getProperty(propertyId);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }

      if (req.user!.agencyId !== property.agencyId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const { rooms } = req.body;
      
      if (!Array.isArray(rooms) || rooms.length === 0) {
        return res.status(400).json({ message: "Rooms array is required and must not be empty" });
      }

      if (rooms.length > 50) {
        return res.status(400).json({ message: "Maximum 50 rooms can be created at once" });
      }

      // Validate each room has required fields
      for (const room of rooms) {
        if (!room.roomName || !room.roomType) {
          return res.status(400).json({ message: "Each room must have roomName and roomType" });
        }
      }

      const result = await storage.createBulkPropertyRooms(propertyId, rooms);
      
      // Check for validation errors
      if (result.errors && result.errors.length > 0) {
        return res.status(400).json({
          message: "Validation failed",
          errors: result.errors,
        });
      }
      
      console.log(`Bulk created ${result.rooms.length} rooms with ${result.items.length} inspection items for property ${propertyId}`);
      
      res.status(201).json({
        message: `Created ${result.rooms.length} rooms with ${result.items.length} inspection items`,
        rooms: result.rooms,
        itemCount: result.items.length,
      });
    } catch (error) {
      console.error('Error bulk creating rooms:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to create rooms";
      res.status(500).json({ message: errorMessage });
    }
  });

  // Auto-generate rooms based on property details
  app.post("/api/properties/:propertyId/rooms/generate", async (req: AuthenticatedRequest, res) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      
      if (isNaN(propertyId)) {
        return res.status(400).json({ message: "Invalid property ID" });
      }

      const property = await storage.getProperty(propertyId);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }

      // Ensure user has access to this property
      if (req.user!.agencyId !== property.agencyId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Use the helper function to generate rooms
      const createdRooms = await generateRoomsForProperty(property);

      res.status(201).json(createdRooms);
    } catch (error) {
      console.error('Error generating rooms:', error);
      res.status(500).json({ message: "Failed to generate rooms" });
    }
  });

  // Generate inspection report for a property
  app.get("/api/properties/:propertyId/inspection-report", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      
      if (isNaN(propertyId)) {
        return res.status(400).json({ message: "Invalid property ID" });
      }

      const property = await storage.getProperty(propertyId);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }

      // Ensure user has access to this property
      if (req.user!.agencyId !== property.agencyId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get agency for branding
      const agency = await storage.getAgency(property.agencyId);
      if (!agency) {
        return res.status(404).json({ message: "Agency not found" });
      }

      // Get all rooms for this property
      const rooms = await storage.getPropertyRooms(propertyId);
      
      // Get all inspection items for all rooms
      const allItems: any[] = [];
      for (const room of rooms) {
        const items = await storage.getInspectionItems(room.id);
        for (const item of items) {
          allItems.push({
            ...item,
            roomName: room.name,
            roomType: room.type
          });
        }
      }

      // Calculate statistics
      const applicableItems = allItems.filter(item => !item.isNotApplicable);
      const completedItems = applicableItems.filter(item => item.isCompleted || item.lastInspectedDate);
      const itemsNeedingAttention = applicableItems.filter(item => 
        item.condition === 'poor' || item.condition === 'average' || (item.notes && item.notes.length > 0)
      );
      
      const conditionCounts = {
        good: applicableItems.filter(i => i.condition === 'good').length,
        average: applicableItems.filter(i => i.condition === 'average').length,
        poor: applicableItems.filter(i => i.condition === 'poor').length,
        notInspected: applicableItems.filter(i => !i.condition).length
      };

      // Group items by room
      const itemsByRoom: Record<string, any[]> = {};
      for (const item of allItems) {
        if (!itemsByRoom[item.roomName]) {
          itemsByRoom[item.roomName] = [];
        }
        itemsByRoom[item.roomName].push(item);
      }

      // Get the most recent inspection date
      const lastInspectionDate = applicableItems
        .filter(item => item.lastInspectedDate)
        .map(item => new Date(item.lastInspectedDate))
        .sort((a, b) => b.getTime() - a.getTime())[0];

      // Build the report data
      const reportData = {
        property: {
          id: property.id,
          name: property.name,
          address: property.address,
          unitNumber: property.unitNumber,
          propertyType: property.propertyType,
          country: property.country
        },
        agency: {
          name: agency.name,
          email: agency.email,
          phone: agency.phone,
          branding: agency.branding
        },
        generatedAt: new Date().toISOString(),
        lastInspectionDate: lastInspectionDate?.toISOString() || null,
        summary: {
          totalItems: applicableItems.length,
          completedItems: completedItems.length,
          itemsNeedingAttention: itemsNeedingAttention.length,
          naItems: allItems.length - applicableItems.length,
          completionPercentage: applicableItems.length > 0 
            ? Math.round((completedItems.length / applicableItems.length) * 100) 
            : 0,
          conditionCounts
        },
        rooms: Object.keys(itemsByRoom).map(roomName => ({
          name: roomName,
          items: itemsByRoom[roomName].map(item => ({
            id: item.id,
            name: item.itemName,
            category: item.category,
            condition: item.condition,
            notes: item.notes,
            photoUrl: item.photoUrl,
            isCompleted: item.isCompleted,
            isNotApplicable: item.isNotApplicable,
            lastInspectedDate: item.lastInspectedDate,
            nextInspectionDate: item.nextInspectionDate,
            inspectionType: item.inspectionType
          }))
        })),
        itemsNeedingAttention: itemsNeedingAttention.map(item => ({
          id: item.id,
          name: item.itemName,
          roomName: item.roomName,
          condition: item.condition,
          notes: item.notes,
          photoUrl: item.photoUrl
        }))
      };

      res.json(reportData);
    } catch (error) {
      console.error('Error generating inspection report:', error);
      res.status(500).json({ message: "Failed to generate inspection report" });
    }
  });

  // Send inspection report via email
  app.post("/api/properties/:propertyId/inspection-report/send", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      const { recipientEmail, recipientName } = req.body;
      
      if (isNaN(propertyId)) {
        return res.status(400).json({ message: "Invalid property ID" });
      }

      if (!recipientEmail) {
        return res.status(400).json({ message: "Recipient email is required" });
      }

      const property = await storage.getProperty(propertyId);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }

      // Ensure user has access to this property
      if (req.user!.agencyId !== property.agencyId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get agency for branding
      const agency = await storage.getAgency(property.agencyId);
      if (!agency) {
        return res.status(404).json({ message: "Agency not found" });
      }

      // Get all rooms and inspection items
      const rooms = await storage.getPropertyRooms(propertyId);
      const allItems: any[] = [];
      for (const room of rooms) {
        const items = await storage.getInspectionItems(room.id);
        for (const item of items) {
          allItems.push({
            ...item,
            roomName: room.name,
            roomType: room.type
          });
        }
      }

      // Send the report via email
      const { emailService } = await import('./services/email');
      const success = await emailService.sendInspectionReport(
        agency,
        property,
        allItems,
        [recipientEmail]
      );

      if (success) {
        res.json({ 
          message: "Report sent successfully",
          sentTo: recipientEmail
        });
      } else {
        res.status(500).json({ message: "Failed to send report email" });
      }
    } catch (error) {
      console.error('Error sending inspection report:', error);
      res.status(500).json({ message: "Failed to send inspection report" });
    }
  });

  app.put("/api/rooms/:roomId", async (req: AuthenticatedRequest, res) => {
    try {
      const roomId = parseInt(req.params.roomId);
      const updates = insertPropertyRoomSchema.partial().parse(req.body);
      
      const room = await storage.updatePropertyRoom(roomId, updates);
      res.json(room);
    } catch (error) {
      res.status(400).json({ message: "Invalid room data" });
    }
  });

  app.delete("/api/rooms/:roomId", async (req: AuthenticatedRequest, res) => {
    try {
      const roomId = parseInt(req.params.roomId);
      await storage.deletePropertyRoom(roomId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete room" });
    }
  });

  // Inspection Item routes
  // Get all inspection items for a property (for completion calculation)
  app.get("/api/properties/:propertyId/inspection-items", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      const property = await storage.getProperty(propertyId);
      
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }

      // Ensure user has access to this property
      if (req.user!.agencyId !== property.agencyId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const items = await storage.getAllInspectionItemsForProperty(propertyId);
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch inspection items" });
    }
  });

  app.get("/api/rooms/:roomId/inspection-items", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const roomId = parseInt(req.params.roomId);
      const items = await storage.getInspectionItems(roomId);
      
      // Debug: Log a professional item to verify inspectionType is present
      const professionalItem = items.find(i => i.inspectionType === 'professional');
      if (professionalItem) {
        console.log('[DEBUG] Professional item found:', JSON.stringify({
          id: professionalItem.id,
          itemName: professionalItem.itemName,
          inspectionType: professionalItem.inspectionType,
          linkedCertificateId: professionalItem.linkedCertificateId,
          certificateExpiryDate: professionalItem.certificateExpiryDate
        }));
      }
      
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch inspection items" });
    }
  });

  // Get a single inspection item by ID
  app.get("/api/inspection-items/:itemId", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const itemId = parseInt(req.params.itemId);
      const item = await storage.getInspectionItemById(itemId);
      
      if (!item) {
        return res.status(404).json({ message: "Inspection item not found" });
      }

      // Verify user has access to this item through property ownership
      const room = await storage.getPropertyRoomById(item.roomId);
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }

      const property = await storage.getProperty(room.propertyId);
      if (!property || property.agencyId !== req.user!.agencyId) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(item);
    } catch (error) {
      console.error('Error fetching inspection item:', error);
      res.status(500).json({ message: "Failed to fetch inspection item" });
    }
  });

  app.post("/api/rooms/:roomId/inspection-items", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const roomId = parseInt(req.params.roomId);
      const itemData = insertInspectionItemSchema.parse({
        ...req.body,
        roomId
      });
      
      const item = await storage.createInspectionItem(itemData);
      res.status(201).json(item);
    } catch (error) {
      res.status(400).json({ message: "Invalid inspection item data" });
    }
  });

  app.put("/api/inspection-items/:itemId", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const itemId = parseInt(req.params.itemId);
      
      console.log('PUT /api/inspection-items/' + itemId, 'Body:', req.body);
      
      // Validate the updates using partial schema
      const updates = insertInspectionItemSchema.partial().parse(req.body);
      
      console.log('Parsed updates:', updates);
      
      // Get the current item to check requirements
      const currentItem = await storage.getInspectionItemById(itemId);
      if (!currentItem) {
        return res.status(404).json({ message: "Inspection item not found" });
      }
      
      // Handle N/A toggle - skip completion checks when toggling N/A status
      if (updates.isNotApplicable !== undefined) {
        const naUpdates: any = {
          isNotApplicable: updates.isNotApplicable,
          notApplicableReason: updates.notApplicableReason || null,
        };
        
        if (updates.isNotApplicable) {
          naUpdates.isCompleted = false;
          naUpdates.completedDate = null;
          naUpdates.lastInspectedDate = updates.lastInspectedDate || new Date();
          console.log(`N/A toggle ON (PUT): Item "${currentItem.itemName}" (ID: ${itemId}) marked as not applicable`);
        } else {
          naUpdates.lastInspectedDate = null;
          console.log(`N/A toggle OFF (PUT): Item "${currentItem.itemName}" (ID: ${itemId}) marked as applicable`);
        }
        
        const item = await storage.updateInspectionItem(itemId, naUpdates);
        if (!item) {
          return res.status(404).json({ message: "Inspection item not found" });
        }
        return res.json(item);
      }
      
      // CRITICAL: Block completion of professional items without valid certificates
      if (updates.isCompleted === true && currentItem.inspectionType === 'professional') {
        const hasValidCertificate = currentItem.linkedCertificateId && 
          currentItem.certificateExpiryDate && 
          new Date(currentItem.certificateExpiryDate) >= new Date();
        
        if (!hasValidCertificate) {
          console.log(`BLOCKED (PUT): Professional item "${currentItem.itemName}" requires valid certificate`);
          return res.status(400).json({ 
            message: "Professional inspection items require a valid compliance certificate. Upload a certificate to mark this item as complete.",
            code: "CERTIFICATE_REQUIRED"
          });
        }
      }
      
      // CRITICAL: Block completion of photo-required items without photo evidence
      if (updates.isCompleted === true && currentItem.photoRequired) {
        const hasPhoto = updates.photoUrl || currentItem.photoUrl;
        
        if (!hasPhoto) {
          console.log(`BLOCKED (PUT): Photo-required item "${currentItem.itemName}" requires photo evidence`);
          return res.status(400).json({ 
            message: "This inspection item requires photo evidence for compliance. Please capture a photo before marking as complete.",
            code: "PHOTO_REQUIRED"
          });
        }
      }
      
      const item = await storage.updateInspectionItem(itemId, updates);
      
      // Auto-create snapshot when condition or notes are updated (for history tracking)
      if (item && (updates.condition || updates.notes || updates.photoUrl || updates.isCompleted)) {
        try {
          // Get previous snapshot to track deterioration
          const previousSnapshot = await storage.getLatestSnapshot(itemId);
          
          // Determine deterioration severity based on condition change
          let deteriorationSeverity = 'none';
          const newCondition = updates.condition || item.condition;
          if (newCondition === 'poor') {
            deteriorationSeverity = 'severe';
          } else if (newCondition === 'average') {
            deteriorationSeverity = 'moderate';
          }
          
          await storage.createInspectionItemSnapshot({
            inspectionItemId: itemId,
            inspectedById: req.user!.id,
            inspectedAt: new Date(),
            condition: newCondition || null,
            notes: (updates.notes as string) || item.notes || null,
            photoUrl: (updates.photoUrl as string) || item.photoUrl || null,
            deteriorationSeverity,
            previousCondition: previousSnapshot?.condition || null,
          });
          console.log('Created inspection snapshot for item:', itemId);
        } catch (snapshotError) {
          console.error('Failed to create snapshot:', snapshotError);
          // Don't fail the main update if snapshot fails
        }
      }
      
      console.log('Updated item:', item);
      res.json(item);
    } catch (error) {
      console.error('Error updating inspection item:', error);
      if (error instanceof Error) {
        res.status(400).json({ message: `Invalid inspection item data: ${error.message}` });
      } else {
        res.status(400).json({ message: "Invalid inspection item data" });
      }
    }
  });

  // Get inspection item history (snapshots)
  app.get("/api/inspection-items/:itemId/history", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const itemId = parseInt(req.params.itemId);
      const snapshots = await storage.getInspectionItemSnapshots(itemId);
      res.json(snapshots);
    } catch (error) {
      console.error('Error fetching inspection item history:', error);
      res.status(500).json({ message: "Failed to fetch inspection history" });
    }
  });

  // PATCH handler for inspection items - includes completion logic
  app.patch("/api/inspection-items/:itemId", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const itemId = parseInt(req.params.itemId);
      const { isCompleted, completedDate, ...otherUpdates } = req.body;
      
      console.log('PATCH /api/inspection-items/' + itemId, 'Body:', req.body);
      
      // Get the current item to access roomId
      const currentItem = await storage.getInspectionItemById(itemId);
      if (!currentItem) {
        return res.status(404).json({ message: "Inspection item not found" });
      }
      
      // Verify user has access to this item through property ownership
      const room = await storage.getPropertyRoomById(currentItem.roomId);
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }
      const property = await storage.getProperty(room.propertyId);
      if (!property || property.agencyId !== req.user!.agencyId) {
        console.log(`ACCESS DENIED: User ${req.user!.id} (agency ${req.user!.agencyId}) tried to update item ${itemId} belonging to agency ${property?.agencyId}`);
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Handle N/A toggle - skip completion checks when toggling N/A status
      if (otherUpdates.isNotApplicable !== undefined) {
        const naUpdates: any = {
          isNotApplicable: otherUpdates.isNotApplicable,
          notApplicableReason: otherUpdates.notApplicableReason || null,
        };
        
        if (otherUpdates.isNotApplicable) {
          naUpdates.isCompleted = false;
          naUpdates.completedDate = null;
          naUpdates.lastInspectedDate = otherUpdates.lastInspectedDate ? new Date(otherUpdates.lastInspectedDate) : new Date();
          console.log(`N/A toggle ON: Item "${currentItem.itemName}" (ID: ${itemId}) marked as not applicable`);
        } else {
          naUpdates.lastInspectedDate = null;
          console.log(`N/A toggle OFF: Item "${currentItem.itemName}" (ID: ${itemId}) marked as applicable`);
        }
        
        const item = await storage.updateInspectionItem(itemId, naUpdates);
        if (!item) {
          return res.status(404).json({ message: "Inspection item not found" });
        }
        console.log('N/A toggle updated item:', item);
        return res.json(item);
      }
      
      // CRITICAL: Block manual completion of professional items without valid certificates
      if (isCompleted === true && currentItem.inspectionType === 'professional') {
        // Check if item has a valid (non-expired) certificate
        const hasValidCertificate = currentItem.linkedCertificateId && 
          currentItem.certificateExpiryDate && 
          new Date(currentItem.certificateExpiryDate) >= new Date();
        
        if (!hasValidCertificate) {
          console.log(`BLOCKED: Professional item "${currentItem.itemName}" (ID: ${itemId}) requires valid certificate for completion`);
          return res.status(400).json({ 
            message: "Professional inspection items require a valid compliance certificate. Upload a certificate to mark this item as complete.",
            code: "CERTIFICATE_REQUIRED"
          });
        }
      }
      
      // CRITICAL: Block completion of photo-required items without photo evidence
      if (isCompleted === true && currentItem.photoRequired) {
        // Check if photo is being provided in this update OR already exists
        const hasPhoto = otherUpdates.photoUrl || currentItem.photoUrl;
        
        if (!hasPhoto) {
          console.log(`BLOCKED: Photo-required item "${currentItem.itemName}" (ID: ${itemId}) requires photo evidence for completion`);
          return res.status(400).json({ 
            message: "This inspection item requires photo evidence for compliance. Please capture a photo before marking as complete.",
            code: "PHOTO_REQUIRED"
          });
        }
      }
      
      const updates: any = { ...otherUpdates };
      
      // Handle completion status changes
      if (isCompleted !== undefined) {
        updates.isCompleted = isCompleted || false;
        updates.completedDate = isCompleted ? new Date(completedDate || new Date()) : null;
        
        // If marking as complete, calculate next inspection date
        if (isCompleted) {
          const now = new Date();
          // ALWAYS set lastInspectedDate when marking complete
          updates.lastInspectedDate = now;
          
          // Default to 12 months for next inspection if no specific interval
          let intervalMonths = 12;
          
          try {
            // Use property already fetched for access control to find country
            if (property && property.country) {
              // Find matching inspection interval
              const intervalData = getInspectionIntervalForItem(property.country, currentItem.itemName);
              
              if (intervalData) {
                // Parse the visual inspection interval
                const parsedInterval = parseInspectionInterval(intervalData.visualInspectionInterval);
                
                // Validate interval is valid (not null/NaN)
                if (parsedInterval && parsedInterval > 0) {
                  intervalMonths = parsedInterval;
                  
                  // Add compliance-specific fields
                  Object.assign(updates, {
                    visualInspectionInterval: intervalData.visualInspectionInterval,
                    professionalServiceInterval: intervalData.professionalServiceInterval,
                    legalRequirement: intervalData.legalRequirement
                  });
                  
                  console.log(`✓ PATCH: Using compliance interval for "${currentItem.itemName}": ${intervalMonths} months`);
                }
              } else {
                console.log(`PATCH: No interval data found for item "${currentItem.itemName}" in country "${property.country}" - using default 12 months`);
              }
            } else {
              console.log(`PATCH: Property country not set for property ${room.propertyId} - using default 12 months`);
            }
          } catch (scheduleError) {
            console.error('PATCH: Error calculating next inspection date:', scheduleError);
            // Continue with default interval
          }
          
          // Always calculate next inspection date
          const nextDate = calculateNextInspectionDate(now, intervalMonths);
          updates.nextInspectionDate = nextDate;
          updates.inspectionIntervalMonths = intervalMonths;
          
          console.log(`✓ PATCH: Scheduled next inspection for "${currentItem.itemName}" in ${intervalMonths} months (${nextDate.toISOString().split('T')[0]})`);
        } else {
          // If uncompleting, clear inspection schedule
          Object.assign(updates, {
            lastInspectedDate: null,
            nextInspectionDate: null,
            inspectionIntervalMonths: null,
            visualInspectionInterval: null,
            professionalServiceInterval: null,
            legalRequirement: null
          });
        }
      }
      
      console.log('PATCH parsed updates:', updates);
      
      const item = await storage.updateInspectionItem(itemId, updates);
      
      if (!item) {
        return res.status(404).json({ message: "Inspection item not found" });
      }
      
      console.log('PATCH updated item:', item);
      res.json(item);
    } catch (error) {
      console.error('Error updating inspection item via PATCH:', error);
      if (error instanceof Error) {
        res.status(500).json({ message: `Failed to update: ${error.message}` });
      } else {
        res.status(500).json({ message: "Failed to update inspection item" });
      }
    }
  });

  // Mark inspection item as complete/incomplete
  app.put("/api/inspection-items/:itemId/complete", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const itemId = parseInt(req.params.itemId);
      const { isCompleted, completedDate } = req.body;
      
      console.log('PUT /api/inspection-items/' + itemId + '/complete', 'Body:', req.body);
      
      // Get the current item to access roomId
      const currentItem = await storage.getInspectionItemById(itemId);
      if (!currentItem) {
        return res.status(404).json({ message: "Inspection item not found" });
      }
      
      const updates: any = {
        isCompleted: isCompleted || false,
        completedDate: isCompleted ? (completedDate || new Date().toISOString()) : null
      };
      
      // If marking as complete, calculate next inspection date
      if (isCompleted) {
        try {
          // Get room to find property
          const room = await storage.getPropertyRoomById(currentItem.roomId);
          if (room) {
            // Get property to find country
            const property = await storage.getProperty(room.propertyId);
            if (property && property.country) {
              // Find matching inspection interval
              const intervalData = getInspectionIntervalForItem(property.country, currentItem.itemName);
              
              if (intervalData) {
                // Parse the visual inspection interval
                const intervalMonths = parseInspectionInterval(intervalData.visualInspectionInterval);
                
                // Validate interval is valid (not null/NaN)
                if (intervalMonths && intervalMonths > 0) {
                  // Calculate next inspection date
                  const now = new Date();
                  const nextDate = calculateNextInspectionDate(now, intervalMonths);
                  
                  // CRITICAL: Add scheduling fields to updates object
                  Object.assign(updates, {
                    lastInspectedDate: now,
                    nextInspectionDate: nextDate,
                    inspectionIntervalMonths: intervalMonths,
                    visualInspectionInterval: intervalData.visualInspectionInterval,
                    professionalServiceInterval: intervalData.professionalServiceInterval,
                    legalRequirement: intervalData.legalRequirement
                  });
                  
                  console.log(`✓ Scheduled next inspection for "${currentItem.itemName}" in ${intervalMonths} months (${nextDate.toISOString().split('T')[0]})`);
                } else {
                  console.warn(`Invalid inspection interval for "${currentItem.itemName}": ${intervalData.visualInspectionInterval}`);
                }
              } else {
                console.log(`No interval data found for item "${currentItem.itemName}" in country "${property.country}"`);
              }
            } else {
              console.log(`Property country not set for property ${room.propertyId}`);
            }
          }
        } catch (scheduleError) {
          console.error('Error calculating next inspection date:', scheduleError);
          // Don't fail the request if scheduling fails - complete the item anyway
        }
      } else {
        // If uncompleting, clear inspection schedule
        Object.assign(updates, {
          lastInspectedDate: null,
          nextInspectionDate: null,
          inspectionIntervalMonths: null,
          visualInspectionInterval: null,
          professionalServiceInterval: null,
          legalRequirement: null
        });
      }
      
      const item = await storage.updateInspectionItem(itemId, updates);
      
      if (!item) {
        return res.status(404).json({ message: "Inspection item not found" });
      }
      
      console.log('Updated completion status for item:', item);
      res.json(item);
    } catch (error) {
      console.error('Error updating inspection item completion:', error);
      res.status(500).json({ message: "Failed to update inspection item completion" });
    }
  });

  app.delete("/api/inspection-items/:itemId", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const itemId = parseInt(req.params.itemId);
      await storage.deleteInspectionItem(itemId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete inspection item" });
    }
  });

  // Bulk add inspection items for room
  app.post("/api/rooms/:roomId/inspection-items/bulk", async (req: AuthenticatedRequest, res) => {
    try {
      const roomId = parseInt(req.params.roomId);
      const { template } = req.body;
      
      const room = await storage.getPropertyRoom(roomId);
      const floor = room?.floor ?? undefined;
      
      const items = await storage.createBulkInspectionItems(roomId, template, floor);
      res.status(201).json(items);
    } catch (error) {
      console.error('Error creating bulk inspection items:', error);
      res.status(400).json({ message: "Failed to create bulk inspection items" });
    }
  });

  // Bulk check inspection items across all rooms in a property
  app.post("/api/properties/:propertyId/bulk-check-items", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      const { itemName } = req.body;
      
      if (!itemName) {
        return res.status(400).json({ message: "Item name is required" });
      }
      
      const property = await storage.getProperty(propertyId);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }

      // Ensure user has access to this property
      if (req.user!.agencyId !== property.agencyId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updatedItems = await storage.bulkCheckInspectionItems(propertyId, itemName);
      res.json({ updatedCount: updatedItems.length, items: updatedItems });
    } catch (error) {
      console.error('Error bulk checking inspection items:', error);
      res.status(500).json({ message: "Failed to bulk check inspection items" });
    }
  });

  // Get all upcoming inspections for the agency (for calendar view and reports)
  app.get("/api/inspections/upcoming", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const agencyId = req.user!.agencyId!;
      
      // Get all properties for the agency
      const properties = await storage.getPropertiesByAgency(agencyId);
      
      // Get all inspection items across all properties (including all relevant fields for reports)
      const allInspections: any[] = [];
      
      for (const property of properties) {
        const rooms = await storage.getPropertyRooms(property.id);
        
        for (const room of rooms) {
          const items = await storage.getInspectionItems(room.id);
          
          for (const item of items) {
            // Include all items (not just those with nextInspectionDate) for complete reporting
            allInspections.push({
              id: item.id,
              itemName: item.itemName,
              category: item.category,
              priority: item.priority,
              frequency: item.frequency,
              description: item.description,
              nextInspectionDate: item.nextInspectionDate,
              lastInspectedDate: item.lastInspectedDate,
              inspectionIntervalMonths: item.inspectionIntervalMonths,
              visualInspectionInterval: item.visualInspectionInterval,
              professionalServiceInterval: item.professionalServiceInterval,
              legalRequirement: item.legalRequirement,
              isCompleted: item.isCompleted,
              isNotApplicable: item.isNotApplicable,
              notApplicableReason: item.notApplicableReason,
              photoRequired: item.photoRequired,
              photoUrl: item.photoUrl,
              assignedContractorId: item.assignedContractorId,
              complianceStandard: item.complianceStandard,
              roomId: room.id,
              roomName: room.roomName,
              roomType: room.roomType,
              propertyId: property.id,
              propertyName: property.address,
              propertyAddress: property.address,
              propertyNextInspectionDate: property.nextInspectionDate || null
            });
          }
        }
      }
      
      // Sort by next inspection date (earliest first), items without dates at the end
      allInspections.sort((a, b) => {
        if (!a.nextInspectionDate && !b.nextInspectionDate) return 0;
        if (!a.nextInspectionDate) return 1;
        if (!b.nextInspectionDate) return -1;
        const dateA = new Date(a.nextInspectionDate).getTime();
        const dateB = new Date(b.nextInspectionDate).getTime();
        return dateA - dateB;
      });
      
      res.json(allInspections);
    } catch (error) {
      console.error('Error fetching upcoming inspections:', error);
      res.status(500).json({ message: "Failed to fetch upcoming inspections" });
    }
  });

  // =================== COMPLIANCE CERTIFICATES ===================
  
  // Get all certificates for agency
  app.get("/api/certificates", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const certificates = await storage.getComplianceCertificatesByAgency(req.user!.agencyId!);
      res.json(certificates);
    } catch (error) {
      console.error('Error fetching certificates:', error);
      res.status(500).json({ message: "Failed to fetch certificates" });
    }
  });

  // Get certificates for specific property
  app.get("/api/properties/:propertyId/certificates", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      const property = await storage.getProperty(propertyId);
      
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      
      if (req.user!.agencyId !== property.agencyId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const certificates = await storage.getComplianceCertificatesByProperty(propertyId);
      res.json(certificates);
    } catch (error) {
      console.error('Error fetching property certificates:', error);
      res.status(500).json({ message: "Failed to fetch property certificates" });
    }
  });

  // Get expiring certificates
  app.get("/api/certificates/expiring", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const certificates = await storage.getExpiringCertificates(req.user!.agencyId!, days);
      res.json(certificates);
    } catch (error) {
      console.error('Error fetching expiring certificates:', error);
      res.status(500).json({ message: "Failed to fetch expiring certificates" });
    }
  });

  // Create new certificate
  app.post("/api/certificates", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const validatedData = insertComplianceCertificateSchema.parse({
        ...req.body,
        agencyId: req.user!.agencyId
      });
      
      const certificate = await storage.createComplianceCertificate(validatedData);
      
      // Auto-apply certificate coverage to matching professional items
      if (certificate.propertyId) {
        const coverageResult = await storage.applyCertificateCoverage(certificate.id, certificate.propertyId);
        console.log(`Certificate coverage applied: ${coverageResult.updated} items updated`);
      }
      
      res.status(201).json(certificate);
    } catch (error) {
      console.error('Error creating certificate:', error);
      res.status(400).json({ message: "Failed to create certificate" });
    }
  });

  // Update certificate
  app.patch("/api/certificates/:id", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const certificate = await storage.getComplianceCertificate(id);
      
      if (!certificate) {
        return res.status(404).json({ message: "Certificate not found" });
      }
      
      if (req.user!.agencyId !== certificate.agencyId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updatedCertificate = await storage.updateComplianceCertificate(id, req.body);
      res.json(updatedCertificate);
    } catch (error) {
      console.error('Error updating certificate:', error);
      res.status(400).json({ message: "Failed to update certificate" });
    }
  });

  // Delete certificate
  app.delete("/api/certificates/:id", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const certificate = await storage.getComplianceCertificate(id);
      
      if (!certificate) {
        return res.status(404).json({ message: "Certificate not found" });
      }
      
      if (req.user!.agencyId !== certificate.agencyId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Remove certificate coverage from linked items before deleting
      const coverageResult = await storage.removeCertificateCoverage(id);
      console.log(`Certificate coverage removed: ${coverageResult.updated} items updated`);
      
      await storage.deleteComplianceCertificate(id);
      res.json({ message: "Certificate deleted successfully" });
    } catch (error) {
      console.error('Error deleting certificate:', error);
      res.status(500).json({ message: "Failed to delete certificate" });
    }
  });

  // Generate secure download link for certificates
  app.get("/api/certificates/:id/download", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const certificate = await storage.getComplianceCertificate(id);
      
      if (!certificate) {
        return res.status(404).json({ message: "Certificate not found" });
      }
      
      if (req.user!.agencyId !== certificate.agencyId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      if (!certificate.fileUrl) {
        return res.status(404).json({ message: "No file associated with this certificate" });
      }
      
      // Extract filename from fileUrl
      const filename = certificate.fileUrl.split('/').pop();
      if (!filename) {
        return res.status(404).json({ message: "Invalid file URL" });
      }
      
      const filePath = path.join(process.cwd(), "uploads", "certificates", filename);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "Certificate file not found on server" });
      }
      
      // Set appropriate headers for file download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      
      // Stream the file
      res.sendFile(filePath);
    } catch (error) {
      console.error('Error serving certificate file:', error);
      res.status(500).json({ message: "Failed to serve certificate file" });
    }
  });

  // Inspection Type Classification API
  // Backfill inspection types for all items in agency
  app.post("/api/inspection-types/backfill/:agencyId", requireAgencyAccess, async (req: AuthenticatedRequest, res) => {
    try {
      const agencyId = parseInt(req.params.agencyId);
      const result = await storage.backfillInspectionTypes(agencyId);
      res.json({
        message: `Inspection types classified: ${result.updated} items updated`,
        ...result
      });
    } catch (error) {
      console.error('Error backfilling inspection types:', error);
      res.status(500).json({ message: "Failed to backfill inspection types" });
    }
  });

  // Get professional items for a property (optionally filtered by category)
  app.get("/api/properties/:propertyId/professional-items", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      const property = await storage.getProperty(propertyId);
      
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      
      if (req.user!.agencyId !== property.agencyId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const category = req.query.category as string | undefined;
      const items = await storage.getProfessionalItemsForProperty(propertyId, category);
      res.json(items);
    } catch (error) {
      console.error('Error fetching professional items:', error);
      res.status(500).json({ message: "Failed to fetch professional items" });
    }
  });

  // Get items covered by a specific certificate
  app.get("/api/certificates/:id/covered-items", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const certificate = await storage.getComplianceCertificate(id);
      
      if (!certificate) {
        return res.status(404).json({ message: "Certificate not found" });
      }
      
      if (req.user!.agencyId !== certificate.agencyId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const items = await storage.getItemsCoveredByCertificate(id);
      res.json(items);
    } catch (error) {
      console.error('Error fetching covered items:', error);
      res.status(500).json({ message: "Failed to fetch covered items" });
    }
  });

  // Manually apply certificate coverage to a property
  app.post("/api/certificates/:id/apply-coverage", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const certificate = await storage.getComplianceCertificate(id);
      
      if (!certificate) {
        return res.status(404).json({ message: "Certificate not found" });
      }
      
      if (req.user!.agencyId !== certificate.agencyId) {
        return res.status(403).json({ message: "Access denied" });
      }

      if (!certificate.propertyId) {
        return res.status(400).json({ message: "Certificate must be linked to a property" });
      }

      const result = await storage.applyCertificateCoverage(id, certificate.propertyId);
      res.json({
        message: `Certificate coverage applied to ${result.updated} items`,
        ...result
      });
    } catch (error) {
      console.error('Error applying certificate coverage:', error);
      res.status(500).json({ message: "Failed to apply certificate coverage" });
    }
  });

  // Certificate Email Submissions API
  // Get submissions for a property
  app.get("/api/certificate-submissions/property/:propertyId", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      const property = await storage.getProperty(propertyId);
      
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      
      if (req.user!.agencyId !== property.agencyId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const submissions = await storage.getCertificateSubmissionsByProperty(propertyId);
      res.json(submissions);
    } catch (error) {
      console.error('Error fetching certificate submissions:', error);
      res.status(500).json({ message: "Failed to fetch certificate submissions" });
    }
  });

  // Get all submissions for agency
  app.get("/api/certificate-submissions/agency/:agencyId", requireAgencyAccess, async (req: AuthenticatedRequest, res) => {
    try {
      const agencyId = parseInt(req.params.agencyId);
      const submissions = await storage.getCertificateSubmissionsByAgency(agencyId);
      res.json(submissions);
    } catch (error) {
      console.error('Error fetching agency certificate submissions:', error);
      res.status(500).json({ message: "Failed to fetch certificate submissions" });
    }
  });

  // Get pending submissions for agency
  app.get("/api/certificate-submissions/pending/:agencyId", requireAgencyAccess, async (req: AuthenticatedRequest, res) => {
    try {
      const agencyId = parseInt(req.params.agencyId);
      const submissions = await storage.getPendingCertificateSubmissions(agencyId);
      res.json(submissions);
    } catch (error) {
      console.error('Error fetching pending submissions:', error);
      res.status(500).json({ message: "Failed to fetch pending submissions" });
    }
  });

  // Create a new certificate submission (for simulating email receipt)
  app.post("/api/certificate-submissions", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { propertyId, senderEmail, senderName, subject, certificateType, fileName, fileUrl, fileSize } = req.body;
      
      const property = await storage.getProperty(propertyId);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      
      if (req.user!.agencyId !== property.agencyId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const submission = await storage.createCertificateSubmission({
        propertyId,
        agencyId: property.agencyId,
        senderEmail,
        senderName,
        subject,
        certificateType,
        fileName,
        fileUrl,
        fileSize,
        status: 'pending'
      });
      
      res.status(201).json(submission);
    } catch (error) {
      console.error('Error creating certificate submission:', error);
      res.status(400).json({ message: "Failed to create certificate submission" });
    }
  });

  // Update certificate submission status (mark as processed/rejected)
  app.patch("/api/certificate-submissions/:id", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const submission = await storage.getCertificateSubmission(id);
      
      if (!submission) {
        return res.status(404).json({ message: "Submission not found" });
      }
      
      if (req.user!.agencyId !== submission.agencyId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updates: any = { ...req.body };
      if (req.body.status === 'processed' || req.body.status === 'rejected') {
        updates.processedAt = new Date();
        updates.processedBy = req.user!.id;
      }

      const updatedSubmission = await storage.updateCertificateSubmission(id, updates);
      
      // When manually approving (status = 'processed'), link inspection items
      if (req.body.status === 'processed' && submission.certificateType) {
        try {
          const itemsToUpdate = getCertificateInspectionItems(submission.certificateType);
          console.log(`Manual approval: Looking for items matching patterns:`, itemsToUpdate);
          
          if (itemsToUpdate.length > 0) {
            const propertyRooms = await storage.getPropertyRooms(submission.propertyId);
            let linkedCount = 0;
            
            // Parse expiry date from AI notes if available, otherwise default to 1 year
            let expiryDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
            if (submission.notes) {
              const expiryMatch = submission.notes.match(/Expiry[=:]?\s*(\d{4}-\d{2}-\d{2})/i);
              if (expiryMatch) {
                expiryDate = new Date(expiryMatch[1]);
              }
            }
            
            for (const room of propertyRooms) {
              const items = await storage.getInspectionItems(room.id);
              for (const item of items) {
                const itemNameLower = item.itemName.toLowerCase();
                const matches = itemsToUpdate.some(pattern => 
                  itemNameLower.includes(pattern.toLowerCase())
                );
                
                if (matches) {
                  // Link certificate but DON'T auto-complete if photo is required without evidence
                  const canAutoComplete = !item.photoRequired || !!item.photoUrl;
                  
                  await storage.updateInspectionItem(item.id, {
                    linkedCertificateId: submission.id,
                    certificateExpiryDate: expiryDate,
                    certificateCoveredAt: new Date(),
                    isCompleted: canAutoComplete ? true : false, // Only complete if no photo required or photo exists
                    lastInspectedDate: canAutoComplete ? new Date() : (item.lastInspectedDate ?? undefined),
                  });
                  linkedCount++;
                  if (!canAutoComplete) {
                    console.log(`Linked certificate to item: ${item.itemName} (PENDING: photo required) in room ${room.roomName}`);
                  } else {
                    console.log(`Linked certificate to item: ${item.itemName} in room ${room.roomName}`);
                  }
                }
              }
            }
            
            console.log(`Manual approval: Linked ${linkedCount} inspection items to certificate submission ${id}`);
          }
        } catch (linkError) {
          console.error('Error linking inspection items during manual approval:', linkError);
        }
      }
      
      res.json(updatedSubmission);
    } catch (error) {
      console.error('Error updating certificate submission:', error);
      res.status(400).json({ message: "Failed to update certificate submission" });
    }
  });

  // Delete certificate submission
  app.delete("/api/certificate-submissions/:id", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const submission = await storage.getCertificateSubmission(id);
      
      if (!submission) {
        return res.status(404).json({ message: "Submission not found" });
      }
      
      if (req.user!.agencyId !== submission.agencyId) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteCertificateSubmission(id);
      res.json({ message: "Certificate submission deleted successfully" });
    } catch (error) {
      console.error('Error deleting certificate submission:', error);
      res.status(500).json({ message: "Failed to delete certificate submission" });
    }
  });

  // Get inspection completion ratios for properties
  app.get("/api/properties/:agencyId/inspection-ratios", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const agencyId = parseInt(req.params.agencyId);
      
      if (req.user!.agencyId !== agencyId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const ratios = await storage.getPropertyInspectionRatios(agencyId);
      res.json(ratios);
    } catch (error) {
      console.error('Error fetching inspection ratios:', error);
      res.status(500).json({ message: "Failed to fetch inspection ratios" });
    }
  });

  // Get inspection periods with completion status for all properties in agency
  app.get("/api/agencies/:agencyId/inspection-periods", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const agencyId = parseInt(req.params.agencyId);
      
      if (req.user!.agencyId !== agencyId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const periodsData = await storage.getInspectionPeriodsWithCompletion(agencyId);
      res.json(periodsData);
    } catch (error) {
      console.error('Error fetching inspection periods:', error);
      res.status(500).json({ message: "Failed to fetch inspection periods" });
    }
  });

  // Get inspection periods for a specific property
  app.get("/api/properties/:propertyId/inspection-periods", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      
      // Get property to verify access
      const property = await storage.getPropertyById(propertyId);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }

      if (req.user!.agencyId !== property.agencyId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const periods = await storage.getInspectionPeriods(propertyId);
      
      // Enrich each period with its own specific completion data
      const enrichedPeriods = await Promise.all(periods.map(async period => {
        const roomCompletion = await storage.getRoomCompletionForPeriod(period.id);
        return {
          ...period,
          completedItems: roomCompletion.completedRooms,
          totalItems: roomCompletion.totalRooms,
          completionRatio: roomCompletion.totalRooms > 0 ? roomCompletion.completedRooms / roomCompletion.totalRooms : 0
        };
      }));

      res.json(enrichedPeriods);
    } catch (error) {
      console.error('Error fetching inspection periods for property:', error);
      res.status(500).json({ message: "Failed to fetch inspection periods" });
    }
  });

  // Get single inspection period details
  app.get("/api/inspection-periods/:periodId", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const periodId = parseInt(req.params.periodId);
      const period = await storage.getInspectionPeriod(periodId);
      
      if (!period) {
        return res.status(404).json({ message: "Inspection period not found" });
      }
      
      // Verify access through property ownership
      const property = await storage.getPropertyById(period.propertyId);
      if (!property || property.agencyId !== req.user!.agencyId) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(period);
    } catch (error) {
      console.error('Error fetching inspection period:', error);
      res.status(500).json({ message: "Failed to fetch inspection period" });
    }
  });

  // Get inspection items for a specific period
  app.get("/api/inspection-periods/:periodId/items", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const periodId = parseInt(req.params.periodId);
      
      // Verify access through period ownership
      const period = await storage.getInspectionPeriod(periodId);
      if (!period) {
        return res.status(404).json({ message: "Inspection period not found" });
      }
      
      const property = await storage.getPropertyById(period.propertyId);
      if (!property || property.agencyId !== req.user!.agencyId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const items = await storage.getInspectionItemsByPeriod(periodId);
      res.json(items);
    } catch (error) {
      console.error('Error fetching inspection items:', error);
      res.status(500).json({ message: "Failed to fetch inspection items" });
    }
  });

  // Complete an inspection period and generate report
  app.post("/api/inspection-periods/:periodId/complete", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const periodId = parseInt(req.params.periodId);
      
      // Verify access through period ownership
      const period = await storage.getInspectionPeriod(periodId);
      if (!period) {
        return res.status(404).json({ message: "Inspection period not found" });
      }
      
      const property = await storage.getPropertyById(period.propertyId);
      if (!property || property.agencyId !== req.user!.agencyId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Check if already completed
      if (period.completedAt) {
        return res.status(400).json({ message: "Inspection period already completed" });
      }

      // Complete the inspection period and generate report
      const result = await storage.completeInspectionPeriod(periodId, req.user!.id);
      
      console.log(`Inspection period ${periodId} completed with ${result.period.completionPercentage}% completion`);
      
      res.json({
        period: result.period,
        report: result.report,
        message: "Inspection period completed successfully"
      });
    } catch (error) {
      console.error('Error completing inspection period:', error);
      res.status(500).json({ message: "Failed to complete inspection period" });
    }
  });

  // Get inspection report by period ID
  app.get("/api/inspection-periods/:periodId/report", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const periodId = parseInt(req.params.periodId);
      
      // Verify access through period ownership
      const period = await storage.getInspectionPeriod(periodId);
      if (!period) {
        return res.status(404).json({ message: "Inspection period not found" });
      }
      
      const property = await storage.getPropertyById(period.propertyId);
      if (!property || property.agencyId !== req.user!.agencyId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const report = await storage.getInspectionReportByPeriod(periodId);
      if (!report) {
        return res.status(404).json({ message: "No report found for this inspection period" });
      }

      res.json(report);
    } catch (error) {
      console.error('Error fetching inspection report:', error);
      res.status(500).json({ message: "Failed to fetch inspection report" });
    }
  });

  // User notification preferences
  app.get("/api/users/notification-preferences", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      
      let prefs = await storage.getUserNotificationPreferences(userId);
      
      // If no preferences exist, create defaults
      if (!prefs) {
        prefs = await storage.createUserNotificationPreferences({
          userId,
          emailOverdueAlerts: true,
          emailWeeklyDigest: true,
          emailDueSoonAlerts: true,
          leadDays: 7,
          preferredDeliveryTime: '09:00',
          timezone: 'UTC'
        });
      }
      
      res.json(prefs);
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      res.status(500).json({ message: "Failed to fetch notification preferences" });
    }
  });

  app.put("/api/users/notification-preferences", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const updates = req.body;
      
      // Check if preferences exist
      let prefs = await storage.getUserNotificationPreferences(userId);
      
      if (!prefs) {
        // Create new preferences with updates
        prefs = await storage.createUserNotificationPreferences({
          userId,
          emailOverdueAlerts: updates.emailOverdueAlerts ?? true,
          emailWeeklyDigest: updates.emailWeeklyDigest ?? true,
          emailDueSoonAlerts: updates.emailDueSoonAlerts ?? true,
          leadDays: updates.leadDays ?? 7,
          preferredDeliveryTime: updates.preferredDeliveryTime ?? '09:00',
          timezone: updates.timezone ?? 'UTC'
        });
      } else {
        // Update existing preferences
        prefs = await storage.updateUserNotificationPreferences(userId, updates);
      }
      
      res.json(prefs);
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      res.status(500).json({ message: "Failed to update notification preferences" });
    }
  });

  // Get upcoming inspection notifications (for calendar and alerts)
  app.get("/api/inspections/notifications", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const agencyId = req.user!.agencyId!;
      const userId = req.user!.id;
      
      // Get user's notification preferences
      const prefs = await storage.getUserNotificationPreferences(userId);
      const reminderDays = prefs?.leadDays ?? 7;
      
      // Get all properties for the agency
      const properties = await storage.getPropertiesByAgency(agencyId);
      
      const notifications: {
        overdue: any[];
        dueThisWeek: any[];
        upcoming: any[];
      } = {
        overdue: [],
        dueThisWeek: [],
        upcoming: []
      };
      
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      const reminderDate = new Date(today);
      reminderDate.setDate(reminderDate.getDate() + reminderDays);
      
      for (const property of properties) {
        const rooms = await storage.getPropertyRooms(property.id);
        
        for (const room of rooms) {
          const items = await storage.getInspectionItems(room.id);
          
          for (const item of items) {
            if (!item.nextInspectionDate) continue;
            
            const dueDate = new Date(item.nextInspectionDate);
            const notification = {
              id: item.id,
              itemName: item.itemName,
              dueDate: item.nextInspectionDate,
              propertyId: property.id,
              propertyAddress: property.address,
              roomId: room.id,
              roomName: room.roomName,
              category: item.category,
              legalRequirement: item.legalRequirement
            };
            
            if (dueDate < today) {
              notifications.overdue.push({ ...notification, daysOverdue: Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) });
            } else if (dueDate <= nextWeek) {
              notifications.dueThisWeek.push({ ...notification, daysUntilDue: Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) });
            } else if (dueDate <= reminderDate) {
              notifications.upcoming.push({ ...notification, daysUntilDue: Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) });
            }
          }
        }
      }
      
      // Sort each category
      notifications.overdue.sort((a, b) => a.daysOverdue - b.daysOverdue);
      notifications.dueThisWeek.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
      notifications.upcoming.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
      
      res.json({
        notifications,
        summary: {
          overdueCount: notifications.overdue.length,
          dueThisWeekCount: notifications.dueThisWeek.length,
          upcomingCount: notifications.upcoming.length
        },
        preferences: prefs
      });
    } catch (error) {
      console.error('Error fetching inspection notifications:', error);
      res.status(500).json({ message: "Failed to fetch inspection notifications" });
    }
  });

  // User feedback endpoints
  app.post("/api/feedback", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { type, message, sentiment, pageUrl, userAgent } = req.body;
      
      const feedback = await storage.createUserFeedback({
        userId: req.user!.id,
        agencyId: req.user!.agencyId,
        type,
        message,
        sentiment,
        pageUrl,
        userAgent,
        status: 'new'
      });
      
      res.status(201).json(feedback);
    } catch (error) {
      console.error('Error creating feedback:', error);
      res.status(500).json({ message: "Failed to submit feedback" });
    }
  });

  app.get("/api/feedback", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user!.agencyId) {
        return res.json([]);
      }
      const feedback = await storage.getUserFeedbackByAgency(req.user!.agencyId);
      res.json(feedback);
    } catch (error) {
      console.error('Error fetching feedback:', error);
      res.status(500).json({ message: "Failed to fetch feedback" });
    }
  });

  // ============================================
  // PUBLIC CERTIFICATE SUBMISSION ENDPOINTS
  // (No authentication required - for contractors)
  // ============================================

  // Helper to generate/verify property submission tokens
  const SUBMISSION_TOKEN_SECRET = process.env.SUBMISSION_TOKEN_SECRET || 'default-secret-change-in-production';
  
  function generatePropertyToken(propertyId: number, agencyId: number): string {
    const data = `${propertyId}-${agencyId}`;
    return crypto.createHmac('sha256', SUBMISSION_TOKEN_SECRET)
      .update(data)
      .digest('hex')
      .substring(0, 32);
  }
  
  function verifyPropertyToken(token: string, propertyId: number, agencyId: number): boolean {
    const expectedToken = generatePropertyToken(propertyId, agencyId);
    return token === expectedToken;
  }

  // Get property info by submission token (public - no auth)
  app.get("/api/public/property-info/:token", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      
      // Token format: {propertyId}-{hash}
      // We need to find the property by trying to match the token
      const properties = await storage.getAllProperties();
      
      let matchedProperty = null;
      for (const property of properties) {
        if (!property.agencyId) continue;
        const expectedToken = generatePropertyToken(property.id, property.agencyId);
        if (token === expectedToken) {
          matchedProperty = property;
          break;
        }
      }
      
      if (!matchedProperty) {
        return res.status(404).json({ message: "Invalid or expired submission link" });
      }
      
      // Get agency name if available
      let agencyName = null;
      if (matchedProperty.agencyId) {
        const agency = await storage.getAgency(matchedProperty.agencyId);
        agencyName = agency?.name;
      }
      
      res.json({
        propertyId: matchedProperty.id,
        address: matchedProperty.address,
        agencyName,
      });
    } catch (error) {
      console.error('Error fetching property info:', error);
      res.status(500).json({ message: "Failed to fetch property info" });
    }
  });

  // Submit certificate and trigger verification (public - no auth)
  app.post("/api/public/submit-certificate/:token", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const { 
        certificateType, 
        issuerName, 
        licenseNumber, 
        phoneNumber,
        issueDate,
        expiryDate,
        certificateNumber,
        workCompleted,
        complianceStatus,
        notes 
      } = req.body;
      
      // Find property by token
      const properties = await storage.getAllProperties();
      let matchedProperty = null;
      for (const property of properties) {
        if (!property.agencyId) continue;
        const expectedToken = generatePropertyToken(property.id, property.agencyId);
        if (token === expectedToken) {
          matchedProperty = property;
          break;
        }
      }
      
      if (!matchedProperty || !matchedProperty.agencyId) {
        return res.status(404).json({ message: "Invalid or expired submission link" });
      }
      
      // Generate 6-digit verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store certificate data and verification request
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15 minute expiry
      
      const verification = await storage.createCertificateVerification({
        propertyId: matchedProperty.id,
        agencyId: matchedProperty.agencyId,
        verificationCode,
        phoneNumber,
        certificateType,
        certificateData: {
          issuerName,
          licenseNumber,
          issueDate,
          expiryDate,
          certificateNumber,
          workCompleted,
          complianceStatus,
          notes,
          propertyAddress: matchedProperty.address,
        },
        status: 'pending',
        attemptCount: 0,
        expiresAt,
      });
      
      // TODO: Send SMS via Twilio when configured
      // For now, log the code (will be replaced with actual SMS)
      console.log(`[SMS PLACEHOLDER] Verification code for ${phoneNumber}: ${verificationCode}`);
      console.log(`[SMS PLACEHOLDER] Property: ${matchedProperty.address}`);
      console.log(`[SMS PLACEHOLDER] Certificate Type: ${certificateType}`);
      
      // Check if Twilio is configured
      const twilioConfigured = process.env.TWILIO_ACCOUNT_SID && 
                               process.env.TWILIO_AUTH_TOKEN && 
                               process.env.TWILIO_PHONE_NUMBER;
      
      if (twilioConfigured) {
        // Twilio integration will be added here
        console.log('[SMS] Twilio is configured - sending verification SMS...');
        // await sendVerificationSMS(phoneNumber, verificationCode, matchedProperty.address);
      } else {
        console.log('[SMS] Twilio not configured - code logged above for testing');
      }
      
      res.json({ 
        verificationId: verification.id,
        message: "Verification code sent",
        // Only include code in development for testing
        ...(process.env.NODE_ENV !== 'production' && { devCode: verificationCode })
      });
    } catch (error) {
      console.error('Error submitting certificate:', error);
      res.status(500).json({ message: "Failed to submit certificate" });
    }
  });

  // Verify certificate code and create the actual certificate (public - no auth)
  app.post("/api/public/verify-certificate", async (req: Request, res: Response) => {
    try {
      const { verificationId, code } = req.body;
      
      const verification = await storage.getCertificateVerification(verificationId);
      
      if (!verification) {
        return res.status(404).json({ message: "Verification request not found" });
      }
      
      if (verification.status !== 'pending') {
        return res.status(400).json({ message: "This verification has already been processed" });
      }
      
      if (new Date() > new Date(verification.expiresAt)) {
        await storage.updateCertificateVerification(verificationId, { status: 'expired' });
        return res.status(400).json({ message: "Verification code has expired. Please submit again." });
      }
      
      if (verification.attemptCount >= 3) {
        await storage.updateCertificateVerification(verificationId, { status: 'failed' });
        return res.status(400).json({ message: "Too many attempts. Please submit again." });
      }
      
      if (verification.verificationCode !== code) {
        await storage.updateCertificateVerification(verificationId, { 
          attemptCount: (verification.attemptCount || 0) + 1 
        });
        return res.status(400).json({ message: "Invalid verification code" });
      }
      
      // Code is correct - create the certificate
      const certData = verification.certificateData as any;
      
      // Create the compliance certificate
      const certificate = await storage.createComplianceCertificate({
        agencyId: verification.agencyId,
        propertyId: verification.propertyId,
        certificateType: verification.certificateType,
        certificateName: `${verification.certificateType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Certificate`,
        issueDate: new Date(certData.issueDate),
        expiryDate: new Date(certData.expiryDate),
        reminderDays: 30,
        certifyingBody: certData.issuerName,
        certificateNumber: certData.certificateNumber,
        notes: `Work completed: ${certData.workCompleted}\nCompliance status: ${certData.complianceStatus}\nLicense: ${certData.licenseNumber}\n${certData.notes || ''}`,
        status: 'active',
      });
      
      // Update verification status
      await storage.updateCertificateVerification(verificationId, { 
        status: 'verified',
        verifiedAt: new Date(),
      });
      
      // Link certificate to inspection items
      const inspectionItemTypes = getCertificateInspectionItems(verification.certificateType);
      const rooms = await storage.getPropertyRooms(verification.propertyId);
      let itemsUpdated = 0;
      
      for (const room of rooms) {
        const items = await storage.getInspectionItems(room.id);
        for (const item of items) {
          const itemNameLower = item.itemName.toLowerCase();
          const matchesType = inspectionItemTypes.some(type => 
            itemNameLower.includes(type.toLowerCase())
          );
          
          if (matchesType && item.inspectionType === 'professional') {
            await storage.updateInspectionItem(item.id, {
              linkedCertificateId: certificate.id,
              certificateCoveredAt: new Date(),
              certificateExpiryDate: new Date(certData.expiryDate),
            });
            itemsUpdated++;
          }
        }
      }
      
      console.log(`Certificate ${certificate.id} created and linked to ${itemsUpdated} inspection items`);
      
      res.json({ 
        success: true,
        certificateId: certificate.id,
        itemsUpdated,
        message: "Certificate verified and created successfully"
      });
    } catch (error) {
      console.error('Error verifying certificate:', error);
      res.status(500).json({ message: "Failed to verify certificate" });
    }
  });

  // Get submission link for a property (authenticated - for property managers)
  app.get("/api/properties/:propertyId/submission-link", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      const property = await storage.getProperty(propertyId);
      
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      
      if (!property.agencyId) {
        return res.status(400).json({ message: "Property must be associated with an agency" });
      }
      
      const token = generatePropertyToken(property.id, property.agencyId);
      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : 'http://localhost:5000';
      
      const submissionLink = `${baseUrl}/submit-certificate/${token}`;
      
      res.json({ 
        submissionLink,
        token,
        propertyAddress: property.address,
      });
    } catch (error) {
      console.error('Error generating submission link:', error);
      res.status(500).json({ message: "Failed to generate submission link" });
    }
  });

  // ===== STRIPE / SUBSCRIPTION ROUTES =====

  app.post("/api/stripe/redeem-promo", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { code } = req.body;
      if (!code) return res.status(400).json({ error: 'Code is required' });
      const { stripeService } = await import('./stripeService');
      const result = await stripeService.redeemPromoCode(code, req.user!.id);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/stripe/checkout", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { planType, propertyCount, tier, channel } = req.body;
      const { stripeService } = await import('./stripeService');
      const { db } = await import('./db');
      const { users } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');

      const [user] = await db.select().from(users).where(eq(users.id, req.user!.id));
      const customerId = await stripeService.createOrGetCustomer(
        user.id, user.email, `${user.firstName} ${user.lastName}`
      );

      const baseUrl = process.env.REPLIT_DOMAINS
        ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
        : 'http://localhost:5000';

      const resolvedTier = tier || user.subscriptionTier || 'my_home';
      const resolvedChannel = channel || user.channel || 'residential';
      const resolvedCount = propertyCount || user.propertyCount || 1;

      const session = await stripeService.createTierCheckoutSession({
        customerId,
        tier: resolvedTier,
        propertyCount: resolvedCount,
        planType: planType || 'monthly',
        channel: resolvedChannel,
        userId: user.id,
        successUrl: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${baseUrl}/signup/plan?canceled=true`,
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error('Checkout error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/stripe/checkout-success", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { session_id } = req.query;
      if (!session_id) return res.status(400).json({ error: 'session_id required' });
      const { stripeService } = await import('./stripeService');
      await stripeService.handleCheckoutComplete(session_id as string);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/stripe/portal", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { db } = await import('./db');
      const { users } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      const [user] = await db.select().from(users).where(eq(users.id, req.user!.id));
      if (!user.stripeCustomerId) return res.status(400).json({ error: 'No billing account found' });
      const { stripeService } = await import('./stripeService');
      const baseUrl = process.env.REPLIT_DOMAINS
        ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
        : 'http://localhost:5000';
      const session = await stripeService.createPortalSession(user.stripeCustomerId, `${baseUrl}/dashboard`);
      res.json({ url: session.url });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/subscription/status", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { db } = await import('./db');
      const { users } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      const [user] = await db.select().from(users).where(eq(users.id, req.user!.id));
      res.json({
        status: user.subscriptionStatus,
        plan: user.subscriptionPlan,
        tier: user.subscriptionTier,
        setupFeePaid: user.setupFeePaid,
        promoCodeUsed: user.promoCodeUsed,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: Promo code management
  app.get("/api/admin/promo-codes", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { db } = await import('./db');
      const { promoCodes } = await import('@shared/schema');
      const codes = await db.select().from(promoCodes).orderBy(promoCodes.createdAt);
      res.json(codes);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/promo-codes", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { db } = await import('./db');
      const { promoCodes, insertPromoCodeSchema } = await import('@shared/schema');
      const data = insertPromoCodeSchema.parse({ ...req.body, code: req.body.code?.toUpperCase() });
      const [created] = await db.insert(promoCodes).values(data).returning();
      res.json(created);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/admin/promo-codes/:id", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { db } = await import('./db');
      const { promoCodes } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      const id = parseInt(req.params.id);
      const [updated] = await db.update(promoCodes).set(req.body).where(eq(promoCodes.id, id)).returning();
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/admin/promo-codes/:id", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { db } = await import('./db');
      const { promoCodes } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      const id = parseInt(req.params.id);
      await db.delete(promoCodes).where(eq(promoCodes.id, id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Update user subscription info after signup
  app.patch("/api/user/subscription", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { db } = await import('./db');
      const { users } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      const { subscriptionTier, subscriptionPlan, propertyCount, phone } = req.body;
      const [updated] = await db.update(users)
        .set({ subscriptionTier, subscriptionPlan, propertyCount, phone })
        .where(eq(users.id, req.user!.id))
        .returning();
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
