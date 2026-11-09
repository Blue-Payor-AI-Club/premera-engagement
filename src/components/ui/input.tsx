import * as React from 'react'
import { cn } from '../../lib/utils'
import { fieldClass } from './variants'

// shadcn/ui Input and Textarea, and shadcn's styled native Select (native keeps phone pickers,
// keyboard use and form semantics).

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(({ className, type, ...props }, ref) => (
  <input type={type} ref={ref} className={cn(fieldClass, 'h-9 py-1 file:border-0 file:bg-transparent file:text-sm file:font-medium', className)} {...props} />
))
Input.displayName = 'Input'

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(fieldClass, 'min-h-[72px] py-2', className)} {...props} />
))
Textarea.displayName = 'Textarea'

export const Select = React.forwardRef<HTMLSelectElement, React.ComponentProps<'select'>>(({ className, ...props }, ref) => (
  <select ref={ref} className={cn(fieldClass, 'h-9 py-1 pr-8 cursor-pointer', className)} {...props} />
))
Select.displayName = 'Select'
