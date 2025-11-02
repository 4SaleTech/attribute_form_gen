import React from 'react';
import type { Theme } from '../renderer/types';

export const defaultTheme: Theme = {
  colors: {
    bg: '#ffffff',
    fg: '#0f172a',
    muted: '#64748b',
    primary: '#2563eb',
    border: '#e2e8f0',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
  },
  radii: {
    sm: '6px',
    md: '10px',
    lg: '14px',
  },
  typography: {
    base: 'Sakr, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
};

export const darkTheme: Theme = {
  colors: {
    bg: '#0f172a',
    fg: '#f1f5f9',
    muted: '#94a3b8',
    primary: '#3b82f6',
    border: '#334155',
  },
  spacing: defaultTheme.spacing,
  radii: defaultTheme.radii,
  typography: defaultTheme.typography,
};

export const ThemeContext = React.createContext<Theme>(defaultTheme);



