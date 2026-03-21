'use client';
// lib/hooks/useEditorMode.ts
// Hook compartido para leer el modo del editor (easy/pro) desde localStorage.
// Centraliza el patrón que antes estaba duplicado en AnalyticsAdmin, CrmAdmin y AcademyAdmin.

import { useState, useEffect } from 'react';

export function useEditorMode(): 'easy' | 'pro' {
  const [mode, setMode] = useState<'easy' | 'pro'>('easy');

  useEffect(() => {
    const stored = localStorage.getItem('unitpro_editor_mode');
    if (stored === 'pro') setMode('pro');
  }, []);

  return mode;
}
