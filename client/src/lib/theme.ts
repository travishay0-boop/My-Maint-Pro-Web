import { type User } from '@shared/schema';

export interface ThemeConfig {
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentForeground: string;
  muted: string;
  mutedForeground: string;
  border: string;
  ring: string;
  name: string;
  description: string;
}

export const themes: Record<string, ThemeConfig> = {
  agency: {
    name: 'Sky Blue',
    description: 'Professional sky blue theme for real estate agencies',
    primary: 'hsl(207, 90%, 54%)', // Sky Blue #2196F3
    primaryForeground: 'hsl(0, 0%, 100%)',
    secondary: 'hsl(207, 90%, 96%)',
    secondaryForeground: 'hsl(207, 90%, 25%)',
    accent: 'hsl(207, 90%, 92%)',
    accentForeground: 'hsl(207, 90%, 15%)',
    muted: 'hsl(207, 30%, 95%)',
    mutedForeground: 'hsl(207, 30%, 45%)',
    border: 'hsl(207, 90%, 85%)',
    ring: 'hsl(207, 90%, 54%)',
  },
  maintenance_company: {
    name: 'Sky Blue',
    description: 'Sky blue theme for maintenance companies',
    primary: 'hsl(207, 90%, 54%)', // Sky Blue #2196F3
    primaryForeground: 'hsl(0, 0%, 100%)',
    secondary: 'hsl(207, 90%, 96%)',
    secondaryForeground: 'hsl(207, 90%, 25%)',
    accent: 'hsl(207, 90%, 92%)',
    accentForeground: 'hsl(207, 90%, 15%)',
    muted: 'hsl(207, 30%, 95%)',
    mutedForeground: 'hsl(207, 30%, 45%)',
    border: 'hsl(207, 90%, 85%)',
    ring: 'hsl(207, 90%, 54%)',
  },
  private: {
    name: 'Sky Blue',
    description: 'Sky blue theme for private users',
    primary: 'hsl(207, 90%, 54%)', // Sky Blue #2196F3
    primaryForeground: 'hsl(0, 0%, 100%)',
    secondary: 'hsl(207, 90%, 96%)',
    secondaryForeground: 'hsl(207, 90%, 25%)',
    accent: 'hsl(207, 90%, 92%)',
    accentForeground: 'hsl(207, 90%, 15%)',
    muted: 'hsl(207, 30%, 95%)',
    mutedForeground: 'hsl(207, 30%, 45%)',
    border: 'hsl(207, 90%, 85%)',
    ring: 'hsl(207, 90%, 54%)',
  },
};

export function applyTheme(userType: string) {
  const theme = themes[userType] || themes.agency;
  const root = document.documentElement;

  // Apply CSS custom properties
  root.style.setProperty('--primary', theme.primary);
  root.style.setProperty('--primary-foreground', theme.primaryForeground);
  root.style.setProperty('--secondary', theme.secondary);
  root.style.setProperty('--secondary-foreground', theme.secondaryForeground);
  root.style.setProperty('--accent', theme.accent);
  root.style.setProperty('--accent-foreground', theme.accentForeground);
  root.style.setProperty('--muted', theme.muted);
  root.style.setProperty('--muted-foreground', theme.mutedForeground);
  root.style.setProperty('--border', theme.border);
  root.style.setProperty('--ring', theme.ring);
}

export function getUserTheme(user: User | null): ThemeConfig {
  if (!user) return themes.agency;
  return themes[user.userType] || themes.agency;
}

export function getUserThemeClass(user: User | null): string {
  if (!user) return 'theme-agency';
  return `theme-${user.userType}`;
}