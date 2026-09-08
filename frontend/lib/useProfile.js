'use client';
import { useState, useEffect, useCallback } from 'react';

const NAME_KEY = 'zoom_display_name';
const THEME_KEY = 'zoom_theme';

export function useProfile() {
  const [name, setNameState] = useState('');
  const [showSetup, setShowSetup] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(NAME_KEY);
    const theme = localStorage.getItem(THEME_KEY) || 'light';
    const dark = theme === 'dark';
    setIsDark(dark);
    document.documentElement.setAttribute('data-theme', theme);
    if (!saved || saved === 'test one') {
      setShowSetup(true);
    } else {
      setNameState(saved);
    }
  }, []);

  const saveName = useCallback((newName) => {
    const trimmed = (newName || '').trim() || 'User';
    localStorage.setItem(NAME_KEY, trimmed);
    setNameState(trimmed);
    setShowSetup(false);
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark(prev => {
      const next = !prev;
      const theme = next ? 'dark' : 'light';
      localStorage.setItem(THEME_KEY, theme);
      document.documentElement.setAttribute('data-theme', theme);
      return next;
    });
  }, []);

  return { name, showSetup, setShowSetup, saveName, isDark, toggleTheme };
}

export function getStoredName() {
  if (typeof window === 'undefined') return 'User';
  const saved = localStorage.getItem(NAME_KEY);
  return (!saved || saved === 'test one') ? 'User' : saved;
}
