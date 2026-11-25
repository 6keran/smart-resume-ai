import React, { type ReactNode } from 'react';
import { ReferenceExperience } from '@/components/ui/ReferenceExperience';

/**
 * Reference-matched route entry and screen-only presentation.
 * Native navigation and scroll restoration remain owned by Next.
 */
export default function RootTemplate({ children }: { children: ReactNode }) {
  return (
    <ReferenceExperience>
      {children}
    </ReferenceExperience>
  );
}
