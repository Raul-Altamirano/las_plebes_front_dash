import { type ReactNode } from 'react';

interface PageContainerProps {
  children: ReactNode;
}

export function PageContainer({ children }: PageContainerProps) {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      {children}
    </div>
  );
}
