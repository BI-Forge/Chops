import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { XCircle } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import type { LegalSection } from '../content/legalCopy';

interface LegalDocumentModalProps {
  isOpen: boolean;
  title: string;
  sections: LegalSection[];
  onClose: () => void;
}

/** Modal for Terms or Privacy content on the auth screen. */
export function LegalDocumentModal({ isOpen, title, sections, onClose }: LegalDocumentModalProps) {
  const { theme } = useTheme();

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[11000] flex items-center justify-center p-4 ${
        theme === 'light' ? 'bg-black/50' : 'bg-black/70'
      } backdrop-blur-sm`}
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`bg-gradient-to-br ${
          theme === 'light'
            ? 'from-white/95 to-gray-50/95 border-amber-500/30'
            : 'from-gray-900/95 to-gray-800/95 border-yellow-500/30'
        } backdrop-blur-xl border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-modal-title"
      >
        <div
          className={`flex items-center justify-between p-5 border-b shrink-0 ${
            theme === 'light' ? 'border-amber-500/20' : 'border-yellow-500/20'
          }`}
        >
          <h2
            id="legal-modal-title"
            className={`text-lg font-semibold pr-4 ${theme === 'light' ? 'text-amber-800' : 'text-yellow-400'}`}
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center border transition-colors ${
              theme === 'light'
                ? 'bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-700'
                : 'bg-gray-800 hover:bg-gray-700 border-gray-700 text-gray-300'
            }`}
            aria-label="Close"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <div
          className={`p-5 overflow-y-auto flex-1 custom-scrollbar text-left space-y-6 ${
            theme === 'light' ? 'text-gray-700' : 'text-gray-300'
          }`}
        >
          <p className={`text-xs ${theme === 'light' ? 'text-gray-500' : 'text-gray-500'}`}>
            Free-tier informational document. This does not constitute legal advice. Have counsel review before production
            use.
          </p>
          {sections.map((section) => (
            <section key={section.heading}>
              <h3
                className={`text-sm font-semibold mb-2 ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}
              >
                {section.heading}
              </h3>
              <div className="space-y-2 text-sm leading-relaxed">
                {section.paragraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div
          className={`p-4 border-t shrink-0 flex justify-end ${
            theme === 'light' ? 'border-amber-500/20 bg-gray-50/80' : 'border-yellow-500/20 bg-gray-800/50'
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              theme === 'light'
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'bg-yellow-500 hover:bg-yellow-400 text-gray-900'
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
