import { LoginForm } from './LoginForm';

export const metadata = {
  title: 'Admin Login - AI Daily',
};

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">AI Daily</h1>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Admin Access</h2>
          <p className="text-sm text-gray-500 mb-6">Enter your password to continue</p>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
