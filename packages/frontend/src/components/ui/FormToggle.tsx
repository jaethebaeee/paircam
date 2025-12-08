import { ReactNode } from 'react';

interface FormToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon?: ReactNode;
  ariaLabel?: string;
}

export default function FormToggle({
  label,
  description,
  checked,
  onChange,
  icon,
  ariaLabel,
}: FormToggleProps) {
  return (
    <div className="flex items-center justify-between p-4 sm:p-5 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl sm:rounded-2xl shadow-inner border-2 border-gray-100 hover:shadow-md hover:border-gray-200 transition-all duration-200 group">
      <label className="flex items-center cursor-pointer flex-1">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-0.5 sm:mb-1">
            <span className="text-sm sm:text-base font-semibold text-gray-900">{label}</span>
            {icon && (
              <span className={`transition-colors ${checked ? 'text-pink-500' : 'text-gray-400'}`}>
                {icon}
              </span>
            )}
          </div>
          {description && (
            <p className="text-xs sm:text-sm text-gray-600">{description}</p>
          )}
        </div>
      </label>
      <button
        onClick={() => onChange(!checked)}
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel || `${label} ${checked ? 'enabled' : 'disabled'}`}
        className={`relative inline-flex h-7 sm:h-9 w-12 sm:w-16 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-pink-100 shadow-sm flex-shrink-0 ml-3 ${
          checked ? 'bg-gradient-to-r from-pink-500 to-purple-500 shadow-pink-200' : 'bg-gray-300 hover:bg-gray-400'
        }`}
      >
        <span
          className={`inline-block h-5 sm:h-7 w-5 sm:w-7 transform rounded-full bg-white shadow-md transition-all duration-300 ${
            checked ? 'translate-x-6 sm:translate-x-8 scale-110' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

// Checkbox variant for confirmations
interface FormCheckboxProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  ariaLabel?: string;
}

export function FormCheckbox({
  label,
  description,
  checked,
  onChange,
  ariaLabel,
}: FormCheckboxProps) {
  return (
    <label
      className="flex items-start p-4 sm:p-5 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl sm:rounded-2xl cursor-pointer hover:bg-gradient-to-br hover:from-gray-100 hover:to-gray-200/50 transition-all duration-200 shadow-inner border-2 border-gray-100 hover:border-gray-200 group hover:shadow-md"
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={() => onChange(!checked)}
        className="sr-only"
        aria-label={ariaLabel || label}
      />
      <div className="flex items-center h-5 sm:h-6 mt-0.5 sm:mt-1">
        <div className={`h-6 sm:h-7 w-6 sm:w-7 rounded-lg sm:rounded-xl border-2 flex items-center justify-center transition-all duration-300 shadow-sm ${
          checked
            ? 'bg-gradient-to-br from-pink-500 to-purple-600 border-pink-500 shadow-pink-200 scale-105'
            : 'border-gray-300 bg-white group-hover:border-gray-400'
        }`}>
          {checked && (
            <svg className="w-4 sm:w-5 h-4 sm:h-5 text-white animate-scaleIn" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>
      <div className="ml-3 sm:ml-4 flex-1">
        <span className="text-sm sm:text-base font-semibold text-gray-900">{label}</span>
        {description && (
          <p className="text-xs sm:text-sm text-gray-600 mt-0.5">{description}</p>
        )}
      </div>
    </label>
  );
}
