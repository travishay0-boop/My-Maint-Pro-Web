import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { User } from '@shared/schema';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export async function authenticateUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    // In a real application, you would verify JWT tokens or session cookies
    // For this implementation, we'll use a simple user ID in the header
    const userId = req.headers['x-user-id'];
    
    if (!userId || typeof userId !== 'string') {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const user = await storage.getUser(parseInt(userId));
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid user' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ message: 'Authentication failed' });
  }
}

export function requireRole(roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    next();
  };
}

export function requireAgencyAccess(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const agencyId = parseInt(req.params.agencyId || req.query.agencyId as string);
  
  if (!agencyId) {
    return res.status(400).json({ message: 'Agency ID required' });
  }

  // Check if user has access to this agency
  if (req.user.agencyId !== agencyId && req.user.role !== 'property_owner') {
    return res.status(403).json({ message: 'Access denied to this agency' });
  }

  next();
}
