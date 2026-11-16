import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { AuthLayout } from '../components/layout/AuthLayout.jsx';
import { Card } from '../components/common/Card.jsx';
import { Input } from '../components/common/Input.jsx';
import { Button } from '../components/common/Button.jsx';
import { Alert } from '../components/common/Alert.jsx';
import { Check, X, ArrowRight } from 'lucide-react';

export const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live password validation checks
  const passwordChecks = {
    length: formData.password.length >= 8,
    lowercase: /[a-z]/.test(formData.password),
    uppercase: /[A-Z]/.test(formData.password),
    number: /[0-9]/.test(formData.password),
    special: /[^a-zA-Z0-9]/.test(formData.password)
  };

  const isPasswordValid = Object.values(passwordChecks).every(Boolean);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (generalError) {
      setGeneralError('');
    }
  };

  const validate = () => {
    const errors = {};
    if (!formData.email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (!isPasswordValid) {
      errors.password = 'Password does not meet all security criteria';
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError('');

    if (!validate()) {
      return;
    }

    try {
      setIsSubmitting(true);
      await register({
        email: formData.email.trim().toLowerCase(),
        password: formData.password
      });

      navigate('/app', { replace: true });
    } catch (err) {
      const message =
        err.details?.email?.[0] ||
        err.details?.password?.[0] ||
        err.message ||
        'Account registration failed. Please try again.';
      setGeneralError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Save your information once and reuse it across any online form"
    >
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {generalError && <Alert variant="error" message={generalError} />}

          <Input
            id="email"
            name="email"
            type="email"
            label="Email address"
            required
            autoComplete="email"
            placeholder="name@example.com"
            value={formData.email}
            onChange={handleChange}
            error={fieldErrors.email}
            disabled={isSubmitting}
          />

          <Input
            id="password"
            name="password"
            type="password"
            label="Password"
            required
            autoComplete="new-password"
            placeholder="Create a strong password"
            value={formData.password}
            onChange={handleChange}
            error={fieldErrors.password}
            disabled={isSubmitting}
          />

          {/* Password Strength Checklist */}
          {formData.password.length > 0 && (
            <div className="p-3 bg-former-canvas-muted rounded-lg border border-former-border text-xs space-y-1.5">
              <p className="font-medium text-former-text-secondary mb-1">Password requirements:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                <RequirementItem valid={passwordChecks.length} text="At least 8 characters" />
                <RequirementItem valid={passwordChecks.uppercase} text="One uppercase letter" />
                <RequirementItem valid={passwordChecks.lowercase} text="One lowercase letter" />
                <RequirementItem valid={passwordChecks.number} text="One number" />
                <RequirementItem valid={passwordChecks.special} text="One special character" />
              </div>
            </div>
          )}

          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            label="Confirm password"
            required
            autoComplete="new-password"
            placeholder="Re-enter your password"
            value={formData.confirmPassword}
            onChange={handleChange}
            error={fieldErrors.confirmPassword}
            disabled={isSubmitting}
          />

          <Button
            type="submit"
            variant="primary"
            className="w-full mt-2"
            isLoading={isSubmitting}
            icon={ArrowRight}
          >
            Create account
          </Button>
        </form>

        <div className="mt-6 pt-5 border-t border-former-border text-center">
          <p className="text-[14px] text-former-text-secondary">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-medium text-primary hover:text-primary-hover underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </Card>
    </AuthLayout>
  );
};

const RequirementItem = ({ valid, text }) => {
  return (
    <div
      className={`flex items-center gap-1.5 transition-colors ${
        valid ? 'text-former-success' : 'text-former-text-muted'
      }`}
    >
      {valid ? <Check className="w-3.5 h-3.5 shrink-0" /> : <X className="w-3.5 h-3.5 shrink-0 opacity-40" />}
      <span>{text}</span>
    </div>
  );
};
