import { Fragment, useCallback, useEffect } from 'react';
import { Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';

export const Modal = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
}) => {
  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    full: 'max-w-[90vw]',
  };
  
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape' && closeOnEscape) {
      onClose();
    }
  }, [closeOnEscape, onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Transition.Child
        as={Fragment}
        enter="ease-out duration-300"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="ease-in duration-200"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50" 
          onClick={closeOnOverlayClick ? onClose : undefined}
          aria-hidden="true"
        />
      </Transition.Child>

      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <div className={`${sizes[size]} w-full transform overflow-hidden rounded-2xl bg-alien-800/95 backdrop-blur-xl border border-alien-500/30 shadow-glow-lg animate-scale-in`}>
              {(title || showCloseButton) && (
                <div className="flex items-center justify-between px-6 py-4 border-b border-alien-500/20">
                  <div>
                    {title && (
                      <h2 className="text-heading-md font-semibold text-alien-100">{title}</h2>
                    )}
                    {description && (
                      <p className="mt-1 text-body-sm text-alien-400">{description}</p>
                    )}
                  </div>
                  {showCloseButton && (
                    <button
                      onClick={onClose}
                      className="p-2 text-alien-400 hover:text-alien-100 hover:bg-alien-700/50 rounded-xl transition-colors"
                      aria-label="Close modal"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  )}
                </div>
              )}
              <div className="max-h-[70vh] overflow-y-auto">
                {children}
              </div>
            </div>
          </Transition.Child>
        </div>
      </div>
    </Transition.Root>
  );
};

export default Modal;