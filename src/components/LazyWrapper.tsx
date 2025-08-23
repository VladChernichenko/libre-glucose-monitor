import React, { Suspense, ComponentType } from 'react';

interface LazyWrapperProps {
  component: ComponentType<any>;
  fallback?: React.ReactNode;
  [key: string]: any;
}

/**
 * Lazy loading wrapper component for better performance
 */
const LazyWrapper: React.FC<LazyWrapperProps> = ({ 
  component: Component, 
  fallback = <div>Loading...</div>, 
  ...props 
}) => {
  return (
    <Suspense fallback={fallback}>
      <Component {...props} />
    </Suspense>
  );
};

export default LazyWrapper;
