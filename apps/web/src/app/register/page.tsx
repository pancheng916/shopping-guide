'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nickname: '',
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
    } else if (formData.password.length < 6) {
      newErrors.password = '密码至少需要6位';
    }
    if (!formData.nickname) {
      newErrors.nickname = '请输入昵称';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/user/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        router.push('/login');
      } else {
        setErrors({ email: data.error || '注册失败' });
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
          <h1 className="text-2xl font-bold text-text-primary mb-2">创建账号</h1>
          <p className="text-sm text-text-tertiary">注册后体验更多功能</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">昵称</label>
            <input
              type="text"
              value={formData.nickname}
              onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
              placeholder="请输入昵称"
              className={`w-full h-11 px-4 border rounded-lg text-sm bg-white focus:outline-none transition-colors ${
                errors.nickname ? 'border-danger-500' : 'border-border focus:border-primary-500'
              }`}
            />
            {errors.nickname && (
              <p className="text-xs text-danger-500 mt-1">{errors.nickname}</p>
            )}
          </div>

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
              placeholder="请输入密码（至少6位）"
              className={`w-full h-11 px-4 border rounded-lg text-sm bg-white focus:outline-none transition-colors ${
                errors.password ? 'border-danger-500' : 'border-border focus:border-primary-500'
              }`}
            />
            {errors.password && (
              <p className="text-xs text-danger-500 mt-1">{errors.password}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-11 bg-primary-500 text-white rounded-lg text-base font-semibold cursor-pointer transition-colors hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? '注册中...' : '注册'}
          </button>
        </form>

        <p className="text-center text-sm text-text-tertiary mt-6">
          已有账号？
          <button
            onClick={() => router.push('/login')}
            className="text-primary-500 font-medium hover:text-primary-600 ml-1 cursor-pointer"
          >
            立即登录
          </button>
        </p>
      </div>
    </div>
  );
}
