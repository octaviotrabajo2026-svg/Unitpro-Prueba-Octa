import React from 'react';
import DOMPurify from 'isomorphic-dompurify';

interface SafeHTMLProps {
  as?: React.ElementType;
  html: string | null | undefined;
  className?: string;
  [key: string]: any;
}

export const SafeHTML = ({ as: Tag = 'div', html, className, ...props }: SafeHTMLProps) => {
  // Si no hay HTML, no renderizamos nada para evitar errores
  if (!html) return null;

  // Sanitizar el HTML antes de renderizarlo para prevenir XSS stored
  const sanitizedHTML = DOMPurify.sanitize(html);

  return (
    <Tag
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizedHTML }}
      {...props}
    />
  );
};