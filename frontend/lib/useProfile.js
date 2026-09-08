'use client';
import { useState, useEffect, useCallback } from 'react';

const NAME_KEY = 'zoom_display_name';

export function useProfile() {
  const [name, setNameState] = useState('');
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(NAME_KEY);
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

  return { name, showSetup, setShowSetup, saveName };
}

export function getStoredName() {
  if (typeof window === 'undefined') return 'User';
  const saved = localStorage.getItem(NAME_KEY);
  return (!saved || saved === 'test one') ? 'User' : saved;
}

