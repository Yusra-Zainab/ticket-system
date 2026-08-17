'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import FileUploader from '@/components/ui/FileUploader';
import RichTextEditor from '@/components/ui/RichTextEditor';
import StepperForm from '@/components/ui/StepperForm';
import { mockProjects, mockUsers } from '@/data/mockData';
import { api } from '@/services/api';

const schema = z.object({ title: z.string().min(5), project: z.string().min(1), description: z.string().min(12), priority: z.coerce.number().min(1).max(4), assignedTo: z.string().min(1), dueDate: z.string().min(1), tags: z.string().optional() });
type FormValues = z.infer<typeof schema>;
export default function TicketForm() {
  const router = useRouter(); const [step, setStep] = useState(0); const [files, setFiles] = useState<File[]>([]); const [loading, setLoading] = useState(false); const [submitError, setSubmitError] = useState('');
  const { register, control, handleSubmit, formState: { errors } } = useForm<z.input<typeof schema>, unknown, FormValues>({ resolver: zodResolver(schema), defaultValues: { title: '', project: '', description: '', priority: 2, assignedTo: '', dueDate: '', tags: '' } });
  const ticketTitle = useWatch({ control, name: 'title' });
  const steps = [
    { id: 'details', title: 'Ticket details', description: 'Context and project', component: <div className="space-y-5"><label><span className="label">Title</span><input {...register('title')} className="field" placeholder="Summarize the issue or requested outcome" /><span className="error-text">{errors.title?.message}</span></label><div className="grid gap-5 sm:grid-cols-2"><label><span className="label">Project</span><select {...register('project')} className="field"><option value="">Select project</option>{mockProjects.map((project) => <option key={project.id}>{project.name}</option>)}</select><span className="error-text">{errors.project?.message}</span></label><label><span className="label">Tags</span><input {...register('tags')} className="field" placeholder="payments, frontend" /></label></div><label><span className="label">Description</span><Controller name="description" control={control} render={({ field }) => <RichTextEditor value={field.value} onChange={field.onChange} />} /><span className="error-text">{errors.description?.message}</span></label></div> },
    { id: 'assignment', title: 'Priority & owner', description: 'Plan responsibility', component: <div className="grid gap-5 sm:grid-cols-3"><label><span className="label">Priority</span><select {...register('priority')} className="field"><option value="1">1 — Critical</option><option value="2">2 — High</option><option value="3">3 — Medium</option><option value="4">4 — Low</option></select></label><label><span className="label">Assignee</span><select {...register('assignedTo')} className="field"><option value="">Select resource</option>{mockUsers.map((user) => <option key={user.id}>{user.name}</option>)}</select><span className="error-text">{errors.assignedTo?.message}</span></label><label><span className="label">Due date</span><input type="date" {...register('dueDate')} className="field" /><span className="error-text">{errors.dueDate?.message}</span></label></div> },
    { id: 'attachments', title: 'Attachments', description: 'Add supporting files', component: <div><FileUploader onUpload={setFiles} acceptedTypes={['image/png', 'image/jpeg', 'application/pdf', 'text/plain']} /><div className="mt-6 rounded-xl bg-slate-50 p-4"><h3 className="text-sm font-bold text-slate-800">Ready to create</h3><p className="mt-1 text-sm text-slate-500">{ticketTitle || 'Untitled ticket'} · {files.length} attachment{files.length === 1 ? '' : 's'}</p></div></div> },
  ];
  const submit = handleSubmit(async (values) => { try { setLoading(true); setSubmitError(''); await api.submit('tickets', { ...values, files: files.map((file) => file.name) }); router.push('/tickets'); } catch (error) { setSubmitError(error instanceof Error ? error.message : 'Unable to create ticket.'); } finally { setLoading(false); } });
  return <form onSubmit={(event) => event.preventDefault()} className="card p-5 sm:p-7"><StepperForm steps={steps} currentStep={step} onNext={() => setStep((value) => Math.min(value + 1, steps.length - 1))} onBack={() => setStep((value) => Math.max(0, value - 1))} onComplete={submit} isLoading={loading} />{submitError && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{submitError}</p>}</form>;
}
