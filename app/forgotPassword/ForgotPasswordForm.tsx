'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setEmailError('Email is required');
      return;
    } else if (!email.includes('@')) {
      setEmailError('Please enter a valid email');
      return;
    }

    setEmailError('');
    // Handle send-reset-link logic
    console.log('Password reset requested for:', email);
    setIsSent(true);
  };

  return (
    <div className="relative overflow-hidden">

      <div className="relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <h2
            className="text-[#0284C7] font-semibold text-3xl tracking-tight"
            style={{ fontSize: '30px', lineHeight: '38px', fontWeight: 700 }}
          >
            Forgot Password
          </h2>
          <p
            className="mt-2"
            style={{ fontSize: '16px', lineHeight: '24px', color: '#475467' }}
          >
            Enter your email and we&apos;ll send you a link to reset your password.
          </p>
        </div>

        {isSent ? (
          <div className="text-center py-2">
            <p className="text-sm text-gray-600">
              If an account exists for <span className="font-medium text-gray-900">{email}</span>,
              you&apos;ll receive a password reset link shortly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError('');
                }}
                placeholder="Enter your email"
                error={emailError}
              />
            </div>

            {/* Submit */}
            <Button
              type="submit"
              variant="gradient"
              size="lg"
              fullWidth
              className="mt-2"
            >
              Send Link
            </Button>
          </form>
        )}

        {/* Back link */}
        <div className="text-center mt-4">
          <a
            href="/login"
            className="text-sm font-medium text-brand-blue hover:text-brand-light-blue transition-colors duration-200"
          >
            Back
          </a>
        </div>
      </div>
    </div>
  );
}