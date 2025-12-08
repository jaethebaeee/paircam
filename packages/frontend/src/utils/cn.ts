import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with proper precedence
 * Combines clsx for conditional classes with twMerge to handle Tailwind overrides
 * 
 * @example
 * cn("px-2 py-1", "px-4") // returns "py-1 px-4"
 * cn("px-2", { "px-4": condition }) // returns "px-4" when condition is true
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
