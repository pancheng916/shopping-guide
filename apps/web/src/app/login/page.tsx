'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.email) {
      newErrors.email = '请输入邮箱';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '请输入有效的邮箱地址';
    }
    if (!formData.password) {
      newErrors.password = '请输入密码';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/user/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        login(data.token, data.user);
        router.push('/');
      } else {
        setErrors({ email: data.error || '登录失败' });
      }
    } catch (error) {
      setErrors({ email: '网络错误，请重试' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-orange-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg border border-border-light p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4">
            <div className="w-full h-full bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center text-white text-2xl font-extrabold">
              $
            </div>
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">欢迎回来</h1>
          <p className="text-sm text-text-tertiary">登录后体验更多功能</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">邮箱</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="请输入邮箱"
              className={`w-full h-11 px-4 border rounded-lg text-sm bg-white focus:outline-none transition-colors ${
                errors.email ? 'border-danger-500' : 'border-border focus:border-primary-500'
              }`}
            />
            {errors.email && (
              <p className="text-xs text-danger-500 mt-1">{errors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">密码</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="请输入密码"
              className={`w-full h-11 px-4 border rounded-lg text-sm bg-white focus:outline-none transition-colors ${
                errors.password ? 'border-danger-500' : 'border-border focus:border-primary-500'
              }`}
            />
            {errors.password && (
              <p className="text-xs text-danger-500 mt-1">{errors.password}</p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
              <input type="checkbox" className="w-4 h-4 text-primary-500" />
              记住我
            </label>
            <a href="#" className="text-sm text-primary-500 hover:text-primary-600">
              忘记密码？
            </a>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-11 bg-primary-500 text-white rounded-lg text-base font-semibold cursor-pointer transition-colors hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? '登录中...' : '登录'}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-4 bg-white text-text-tertiary">或使用以下方式登录</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <button className="h-11 border border-border rounded-lg flex items-center justify-center hover:bg-bg-body transition-colors">
            <svg viewBox="0 0 24 24" className="w-5 h-5">
              <path fill="#EA4335" d="M5.2662003,9.76452941 C6.19878754,6.93863203 8.85444915,4.49009114 12.000238,4.49009114 C13.6930357,4.49009114 15.21615010.2257979 16.4141977,6.49009114 L13.0521256,9.0000914 L15.7977143,9.0000914 C17.4568373,9.0000914 18.000238,10.9091819 18.000238,12.0000914 C18.000238,12.4524906 17.919992,12.897298 17.7653009,13.3250226 L14.5851729,18.0000914 L12.000238,18.0000914 C8.86253863,18.0000914 6.2058406,15.6224906 5.281644,12.3500226 C4.89471617,10.941419 4.8752124,9.40021083 5.2662003,9.76452941 Z" />
              <path fill="#34A853" d="M12.000238,20 C9.260781,20 6.969788,18.6257047 5.2736763,16.352213 C5.2736763,16.352213 8.3336003,14.2529527 8.3336003,14.2529527 C9.4062012,15.1806655 10.628647,15.7527468 12.000238,15.7527468 C13.4571219,15.7527468 14.6868206,15.252268 15.6173194,14.3034234 L18.3696639,16.7448601 C16.991781,18.6455366 14.9009038,20 12.000238,20 Z" />
              <path fill="#4A90E2" d="M17.7653009,13.3250226 C17.919992,12.897298 18.000238,12.4524906 18.000238,12.0000914 C18.000238,10.9091819 17.4568373,9.0000914 15.7977143,9.0000914 L13.0521256,9.0000914 C12.3321256,9.0000914 12.000238,9.644444 12.000238,10.3000914 C12.000238,11.0524906 12.3321256,12.0000914 13.0521256,12.0000914 C13.7624146,12.0000914 14.0367479,12.4000914 14.3027468,12.852268 L14.5851729,18.0000914 L17.7653009,13.3250226 Z" />
              <path fill="#FBBC05" d="M5.2662003,9.76452941 C4.8752124,9.40021083 4.89471617,10.941419 5.281644,12.3500226 C5.7057848,13.7376276 6.46036295,15.0196385 7.464788,16.0809123 C7.464788,16.0809123 6.586972,14.2529527 6.586972,14.2529527 C6.194827,13.46123 6.021644,12.7444292 6.021644,12.0000914 C6.021644,11.2557536 6.194827,10.5389528 6.586972,9.74723018 L5.2662003,9.76452941 Z" />
            </svg>
          </button>
          <button className="h-11 border border-border rounded-lg flex items-center justify-center hover:bg-bg-body transition-colors">
            <svg viewBox="0 0 24 24" className="w-5 h-5">
              <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </button>
          <button className="h-11 border border-border rounded-lg flex items-center justify-center hover:bg-bg-body transition-colors">
            <svg viewBox="0 0 24 24" className="w-5 h-5">
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.139 3.633 17.139c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
            </svg>
          </button>
        </div>

        <p className="text-center text-sm text-text-tertiary mt-6">
          还没有账号？
          <button
            onClick={() => router.push('/register')}
            className="text-primary-500 font-medium hover:text-primary-600 ml-1 cursor-pointer"
          >
            立即注册
          </button>
        </p>
      </div>
    </div>
  );
}
