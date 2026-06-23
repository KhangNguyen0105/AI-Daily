import { LoginForm } from './LoginForm';

export const metadata = {
  title: 'Admin Login - AI Daily',
};

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-bg-secondary flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-text-primary">AI Daily</h1>
        </div>

        <div className="bg-bg-primary rounded-lg shadow-lg p-8">
          <h2 className="text-lg font-semibold text-text-primary mb-1">Admin Access</h2>
          <p className="text-sm text-text-tertiary mb-6">Enter your password to continue</p>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
