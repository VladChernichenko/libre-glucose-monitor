/**
 * Simple toast notification utility
 * Shows user-friendly messages without blocking the UI
 */

export interface ToastOptions {
  type?: 'info' | 'success' | 'warning' | 'error';
  duration?: number; // milliseconds
  position?: 'top' | 'bottom';
}

export const showToast = (message: string, options: ToastOptions = {}) => {
  const {
    type = 'info',
    duration = 4000,
    position = 'top'
  } = options;

  // Create toast element
  const toast = document.createElement('div');
  toast.className = `
    fixed left-1/2 transform -translate-x-1/2 z-[9999] 
    max-w-sm w-full mx-4 p-4 rounded-lg shadow-lg
    text-white text-sm font-medium
    transition-all duration-300 ease-in-out
    ${position === 'top' ? 'top-4' : 'bottom-4'}
    ${getToastColors(type)}
  `.trim().replace(/\s+/g, ' ');

  // Add icon and message
  const icon = getToastIcon(type);
  toast.innerHTML = `
    <div class="flex items-center space-x-2">
      <span class="text-lg">${icon}</span>
      <span>${message}</span>
    </div>
  `;

  // Add to DOM
  document.body.appendChild(toast);

  // Animate in
  setTimeout(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  }, 10);

  // Remove after duration
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = `translateX(-50%) translateY(${position === 'top' ? '-' : ''}20px)`;
    
    setTimeout(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    }, 300);
  }, duration);
};

const getToastColors = (type: ToastOptions['type']): string => {
  switch (type) {
    case 'success':
      return 'bg-green-600';
    case 'warning':
      return 'bg-orange-600';
    case 'error':
      return 'bg-red-600';
    default:
      return 'bg-blue-600';
  }
};

const getToastIcon = (type: ToastOptions['type']): string => {
  switch (type) {
    case 'success':
      return '✅';
    case 'warning':
      return '⚠️';
    case 'error':
      return '❌';
    default:
      return 'ℹ️';
  }
};

// Convenience methods
export const showSuccessToast = (message: string) => 
  showToast(message, { type: 'success' });

export const showErrorToast = (message: string) => 
  showToast(message, { type: 'error' });

export const showWarningToast = (message: string) => 
  showToast(message, { type: 'warning' });

export const showInfoToast = (message: string) => 
  showToast(message, { type: 'info' });
