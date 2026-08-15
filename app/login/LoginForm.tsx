'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Admin');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let isValid = true;

    if (!email) {
      setEmailError('Email is required');
      isValid = false;
    } else if (!email.includes('@')) {
      setEmailError('Please enter a valid email');
      isValid = false;
    } else {
      setEmailError('');
    }

    if (!password) {
      setPasswordError('Password is required');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      isValid = false;
    } else {
      setPasswordError('');
    }

    if (isValid) {
      console.log('Login attempt:', { email, password, role });
    }
  };

  return (
    <div className="relative overflow-hidden">

      <div className="relative z-10">

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div>
            <label className="block text-md font-semibold text-gray-700 mb-1.5">
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

          {/* Password */}
          <div>
            <label className="block text-md font-semibold text-gray-700 mb-1.5">
              Password
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (passwordError) setPasswordError('');
              }}
              placeholder="Enter your password"
              error={passwordError}
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-md font-semibold text-gray-700 mb-1.5">
              Role
            </label>
            <div className="relative">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900
                           focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue
                           transition-all duration-200 appearance-none pr-10"
              >
                <option value="Admin">Admin</option>
                <option value="Manager">Client</option>
                <option value="Agent">Resource</option>
              </select>
              {/* Custom chevron */}
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            variant="gradient"
            size="lg"
            fullWidth
            className="mt-2"
          >
            Sign in
          </Button>

          {/* Forgot password */}
          <div className="text-center mt-4">
            <a
              href="/forgotPassword"
              className="text-sm text-brand-blue hover:text-brand-light-blue transition-colors duration-200"
            >
              Forgot password?
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}