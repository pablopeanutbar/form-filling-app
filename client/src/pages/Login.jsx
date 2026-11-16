import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { AuthLayout } from '../components/layout/AuthLayout.jsx';
import { Card } from '../components/common/Card.jsx';
import { Input } from '../components/common/Input.jsx';
import { Button } from '../components/common/Button.jsx';
import { Alert } from '../components/common/Alert.jsx';
import { ArrowRight } from 'lucide-react';

export const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      await login({
        email: formData.email.trim().toLowerCase(),
        password: formData.password
      });

      const redirectPath = location.state?.from?.pathname || '/app';
      navigate(redirectPath, { replace: true });
    } catch (err) {
      const message =
        err.details?.email?.[0] ||
        err.details?.password?.[0] ||
        err.message ||
        'Unable to sign in. Please verify your credentials.';
      setGeneralError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Sign in to formER"
      subtitle="Access your verified profile and intelligent autofill settings"
    >
      <Card>
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
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
            autoComplete="current-password"
            placeholder="Enter your password"
            value={formData.password}
            onChange={handleChange}
            error={fieldErrors.password}
            disabled={isSubmitting}
          />

          <Button
            type="submit"
            variant="primary"
            className="w-full mt-2"
            isLoading={isSubmitting}
            icon={ArrowRight}
          >
            Sign in
          </Button>
        </form>

        <div className="mt-6 pt-5 border-t border-former-border text-center">
          <p className="text-[14px] text-former-text-secondary">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="font-medium text-primary hover:text-primary-hover underline-offset-4 hover:underline"
            >
              Create an account
            </Link>
          </p>
        </div>
      </Card>
    </AuthLayout>
  );
};
