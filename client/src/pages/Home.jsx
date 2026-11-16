import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { Card } from '../components/common/Card.jsx';
import { ShieldCheck, UserCheck, Cpu, Chrome, Database, ArrowRight } from 'lucide-react';

export const Home = () => {
  const { user } = useAuth();

  const formattedDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'Recently';

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-former-text tracking-tight">
          Welcome back
        </h1>
        <p className="text-[15px] text-former-text-secondary mt-1">
          You are authenticated with <span className="font-medium text-former-text">{user?.email}</span>.
        </p>
      </div>

      {/* Account & Session Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-former-text">Account Information</h2>
              <p className="text-xs text-former-text-secondary">Verified credentials & identity</p>
            </div>
          </div>

          <dl className="divide-y divide-former-border text-sm">
            <div className="py-2.5 flex justify-between">
              <dt className="text-former-text-secondary">Email</dt>
              <dd className="font-medium text-former-text">{user?.email}</dd>
            </div>
            <div className="py-2.5 flex justify-between">
              <dt className="text-former-text-secondary">Account ID</dt>
              <dd className="font-mono text-xs text-former-text-secondary truncate max-w-[200px]">
                {user?.id}
              </dd>
            </div>
            <div className="py-2.5 flex justify-between">
              <dt className="text-former-text-secondary">Account Status</dt>
              <dd className="inline-flex items-center gap-1.5 text-xs font-medium text-former-success bg-former-success-soft px-2.5 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-former-success" />
                {user?.status ? user.status.charAt(0).toUpperCase() + user.status.slice(1) : 'Active'}
              </dd>
            </div>
            <div className="py-2.5 flex justify-between">
              <dt className="text-former-text-secondary">Member Since</dt>
              <dd className="text-former-text">{formattedDate}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-former-success-soft text-former-success flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-former-text">Session Security</h2>
              <p className="text-xs text-former-text-secondary">Active cryptographic protection</p>
            </div>
          </div>

          <dl className="divide-y divide-former-border text-sm">
            <div className="py-2.5 flex justify-between">
              <dt className="text-former-text-secondary">Session Cookie</dt>
              <dd className="text-xs font-mono bg-former-canvas-muted px-2 py-0.5 rounded text-former-text">
                former.sid (HttpOnly)
              </dd>
            </div>
            <div className="py-2.5 flex justify-between">
              <dt className="text-former-text-secondary">CSRF Token</dt>
              <dd className="text-xs font-medium text-former-success">Negotiated (Double-Submit)</dd>
            </div>
            <div className="py-2.5 flex justify-between">
              <dt className="text-former-text-secondary">Credential Storage</dt>
              <dd className="text-xs font-medium text-former-text">Argon2id (Server-side)</dd>
            </div>
            <div className="py-2.5 flex justify-between">
              <dt className="text-former-text-secondary">Token Storage</dt>
              <dd className="text-xs font-medium text-former-text">In-memory (No localStorage tokens)</dd>
            </div>
          </dl>
        </Card>
      </div>

      {/* Platform Architecture Status */}
      <Card>
        <h2 className="text-lg font-semibold text-former-text mb-1">Platform Modules</h2>
        <p className="text-sm text-former-text-secondary mb-6">
          Overview of formER system components and upcoming UI integrations.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-former-border bg-former-canvas-muted/40 flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-lg bg-primary-soft text-primary flex items-center justify-center mb-3">
                <Database className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-sm text-former-text">Profile Store</h3>
              <p className="text-xs text-former-text-secondary mt-1 leading-relaxed">
                Personal details, contact information, addresses, and multi-record education schemas.
              </p>
            </div>
            <span className="text-[11px] font-medium text-primary mt-3 inline-flex items-center gap-1">
              Backend verified <ArrowRight className="w-3 h-3" />
            </span>
          </div>

          <div className="p-4 rounded-xl border border-former-border bg-former-canvas-muted/40 flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-lg bg-primary-soft text-primary flex items-center justify-center mb-3">
                <Cpu className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-sm text-former-text">Matching Engine</h3>
              <p className="text-xs text-former-text-secondary mt-1 leading-relaxed">
                Deterministic matching, local MiniLM ONNX embeddings, and ambiguity validation engine.
              </p>
            </div>
            <span className="text-[11px] font-medium text-primary mt-3 inline-flex items-center gap-1">
              Backend verified <ArrowRight className="w-3 h-3" />
            </span>
          </div>

          <div className="p-4 rounded-xl border border-former-border bg-former-canvas-muted/40 flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-lg bg-primary-soft text-primary flex items-center justify-center mb-3">
                <Chrome className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-sm text-former-text">Chrome Extension</h3>
              <p className="text-xs text-former-text-secondary mt-1 leading-relaxed">
                Manifest V3 web form detector, label extraction, and matching API bridge.
              </p>
            </div>
            <span className="text-[11px] font-medium text-primary mt-3 inline-flex items-center gap-1">
              Extension verified <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
};
