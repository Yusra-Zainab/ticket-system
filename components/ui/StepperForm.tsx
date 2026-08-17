'use client';

import { Check } from 'lucide-react';
import Button from './Button';
import { cn } from '@/lib/utils';

export interface Step { id: string; title: string; description?: string; component: React.ReactNode }
export interface StepperFormProps { steps: Step[]; currentStep: number; onNext: () => void; onBack: () => void; onComplete: () => void; isLoading?: boolean }
export default function StepperForm({ steps, currentStep, onNext, onBack, onComplete, isLoading }: StepperFormProps) {
  return <div><ol className="mb-8 grid gap-3 sm:grid-cols-3">{steps.map((step, index) => <li key={step.id} className="flex items-center gap-3"><span className={cn('grid size-9 place-items-center rounded-full border text-sm font-bold', index < currentStep && 'border-green-500 bg-green-500 text-white', index === currentStep && 'border-sky-500 bg-sky-500 text-white', index > currentStep && 'border-slate-200 text-slate-400')}>{index < currentStep ? <Check size={17} /> : index + 1}</span><div><p className="text-sm font-semibold text-slate-800">{step.title}</p>{step.description && <p className="hidden text-xs text-slate-400 lg:block">{step.description}</p>}</div></li>)}</ol><div>{steps[currentStep]?.component}</div><div className="mt-8 flex justify-between border-t border-slate-200 pt-5"><Button variant="secondary" onClick={onBack} disabled={currentStep === 0}>Back</Button><Button onClick={currentStep === steps.length - 1 ? onComplete : onNext} disabled={isLoading}>{isLoading ? 'Saving…' : currentStep === steps.length - 1 ? 'Complete' : 'Continue'}</Button></div></div>;
}
