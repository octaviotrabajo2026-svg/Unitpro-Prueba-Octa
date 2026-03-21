// components/ui/DynamicFont.tsx
"use client";

import React from "react";

// Solo se permiten letras (incluyendo acentos), números, espacios y guiones.
// Cualquier otra entrada se reemplaza por la fuente segura por defecto.
const SAFE_FONT_REGEX = /^[a-zA-ZÀ-ÿ0-9 \-]+$/;
const DEFAULT_FONT = "Inter";

export default function DynamicFont({ font }: { font?: string }) {
  if (!font) return null;

  // Validar que la fuente solo contenga caracteres seguros (whitelist)
  const safeFont = SAFE_FONT_REGEX.test(font) ? font : DEFAULT_FONT;

  const formattedFont = safeFont.replace(/\s+/g, "+");
  const fontUrl = `https://fonts.googleapis.com/css2?family=${formattedFont}:wght@300;400;600;700&display=swap`;

  return (
    <style dangerouslySetInnerHTML={{ __html: `
      @import url('${fontUrl}');
      .custom-font-wrapper {
        font-family: '${safeFont}', sans-serif !important;
      }
    `}} />
  );
}