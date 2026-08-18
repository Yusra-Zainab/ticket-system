'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import StepperForm from '@/components/ui/StepperForm';
import { api } from '@/services/api';
import type { User } from '@/types';

const schemas = {
  project: z.object({ name: z.string().min(3), client: z.string().min(2), description: z.string().min(15), startDate: z.string().min(1), dueDate: z.string().min(1), budget: z.coerce.number().positive(), team: z.array(z.string()).min(1) }),
  client: z.object({ name: z.string().min(2), company: z.string().min(2), email: z.email(), phone: z.string().min(7), notes: z.string().min(10) }),
  resource: z.object({ name: z.string().min(2), email: z.email(), password: z.string().min(8), phone: z.string().min(7), role: z.string().min(2), skills: z.string().min(2), capacity: z.coerce.number().min(1).max(100) }),
};
type Kind = keyof typeof schemas;
type Values = Record<string, string | number | string[]>;

export default function EntityForm({ kind, returnTo, users = [] }: { kind: Kind; returnTo?: string; users?: User[] }) {
  const router = useRouter(); const [step, setStep] = useState(0); const [loading, setLoading] = useState(false); const [submitError, setSubmitError] = useState(''); const [confirming, setConfirming] = useState(false);
  const { register, control, formState: { errors }, handleSubmit } = useForm({ resolver: zodResolver(schemas[kind]), defaultValues: kind === 'project' ? { name: '', client: '', description: '', startDate: '', dueDate: '', budget: 0, team: [] } : kind === 'client' ? { name: '', company: '', email: '', phone: '', notes: '' } : { name: '', email: '', password: '', phone: '', role: '', skills: '', capacity: 75 } });
  const formValues = useWatch({ control });
  const fieldErrors = errors as Record<string, { message?: string }>;
  const field = (name: Parameters<typeof register>[0], label: string, type = 'text', placeholder = '') => <label><span className="label">{label}</span><input {...register(name)} type={type} placeholder={placeholder} className="field" /><span className="error-text">{fieldErrors[name]?.message}</span></label>;
  const projectSteps = [
    { id: 'details', title: 'Project details', description: 'Name, client, and scope', component: <div className="grid gap-5 sm:grid-cols-2">{field('name', 'Project name', 'text', 'Customer portal refresh')}{field('client', 'Client', 'text', 'Aristadou Group')}<label className="sm:col-span-2"><span className="label">Description</span><textarea {...register('description')} rows={5} className="field" placeholder="Describe the desired outcome and scope…" /><span className="error-text">{fieldErrors.description?.message}</span></label></div> },
    { id: 'team', title: 'Assign team', description: 'Select delivery owners', component: <fieldset><legend className="label mb-3">Team members</legend><div className="grid gap-3 sm:grid-cols-2">{users.map((user) => <label key={user.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 hover:bg-slate-50"><input type="checkbox" value={user.name} {...register('team')} className="checkbox" /><span><span className="block text-sm font-semibold text-slate-800">{user.name}</span><span className="text-xs text-slate-400">{user.role}</span></span></label>)}</div><span className="error-text">{fieldErrors.team?.message}</span></fieldset> },
    { id: 'timeline', title: 'Timeline', description: 'Dates and budget', component: <div className="grid gap-5 sm:grid-cols-3">{field('startDate', 'Start date', 'date')}{field('dueDate', 'Due date', 'date')}{field('budget', 'Budget (USD)', 'number')}</div> },
  ];
  const clientSteps = [
    { id: 'contact', title: 'Contact', description: 'Primary contact details', component: <div className="grid gap-5 sm:grid-cols-2">{field('name', 'Contact name')}{field('company', 'Company')}{field('email', 'Email', 'email')}{field('phone', 'Phone', 'tel')}</div> },
    { id: 'notes', title: 'Context', description: 'Relationship notes', component: <label><span className="label">Client notes</span><textarea {...register('notes')} rows={7} className="field" placeholder="Goals, stakeholders, communication preferences…" /><span className="error-text">{fieldErrors.notes?.message}</span></label> },
    { id: 'review', title: 'Review', description: 'Confirm client setup', component: <Review values={formValues} /> },
  ];
  const resourceSteps = [
    { id: 'identity', title: 'Profile', description: 'Identity and contact', component: <div className="grid gap-5 sm:grid-cols-2">{field('name', 'Full name')}{field('email', 'Email', 'email')}{field('password', 'Temporary password', 'password')}{field('phone', 'Phone', 'tel')}{field('role', 'Role')}</div> },
    { id: 'skills', title: 'Expertise', description: 'Skills and capacity', component: <div className="grid gap-5 sm:grid-cols-2">{field('skills', 'Skills', 'text', 'React, TypeScript, Accessibility')}{field('capacity', 'Available capacity (%)', 'number')}</div> },
    { id: 'review', title: 'Review', description: 'Confirm resource setup', component: <Review values={formValues} /> },
  ];
  const steps = kind === 'project' ? projectSteps : kind === 'client' ? clientSteps : resourceSteps;
  const submit = handleSubmit(async (values) => { try { setConfirming(false); setLoading(true); setSubmitError(''); await api.submit(kind, values as Values); if (kind === 'project' && returnTo === 'ticket') router.push(`/tickets/new?project=${encodeURIComponent(String(values.name))}`); else router.push(`/${kind === 'project' ? 'projects' : kind === 'client' ? 'clients' : 'resources'}`); } catch (error) { setSubmitError(error instanceof Error ? error.message : 'Unable to save. Please try again.'); } finally { setLoading(false); } });
  return <form onSubmit={(event) => event.preventDefault()} className="card p-5 sm:p-7"><StepperForm steps={steps} currentStep={step} onNext={() => setStep((value) => Math.min(value + 1, steps.length - 1))} onBack={() => setStep((value) => Math.max(0, value - 1))} onComplete={() => setConfirming(true)} isLoading={loading} />{submitError && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{submitError}</p>}{confirming && <div className="modal-backdrop"><div role="alertdialog" aria-modal="true" className="ticket-modal !w-[410px]"><h2 className="text-2xl font-bold text-slate-700">Confirmation</h2><p className="mt-5 font-semibold text-slate-700">Create this {kind}?</p><div className="mt-6 flex justify-between"><button type="button" className="button-secondary" onClick={() => setConfirming(false)}>Cancel</button><button type="button" className="button-primary" onClick={submit}>Confirm</button></div></div></div>}</form>;
}

function Review({ values }: { values: Record<string, unknown> | undefined }) { return <dl className="grid gap-4 rounded-xl bg-slate-50 p-5 sm:grid-cols-2">{Object.entries(values ?? {}).map(([key, value]) => <div key={key}><dt className="text-xs font-bold uppercase tracking-wide text-slate-400">{key.replace(/([A-Z])/g, ' $1')}</dt><dd className="mt-1 text-sm font-semibold text-slate-800">{Array.isArray(value) ? value.join(', ') : String(value || '—')}</dd></div>)}</dl>; }
