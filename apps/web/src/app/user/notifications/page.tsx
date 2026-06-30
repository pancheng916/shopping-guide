'use client';

import Header from '@/components/Header';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';

const notifications = [
  {
    id: 1,
    type: 'deal_update',
    title: '你关注的商品降价了！',
    content: 'Apple AirPods Pro 降价至 $189.99',
    isRead: false,
    time: '2小时前',
  },
  {
    id: 2,
    type: 'comment_reply',
    title: '有人回复了你的评论',
    content: '感谢分享，我也觉得这个不错！',
    isRead: false,
    time: '昨天',
  },
  {
    id: 3,
    type: 'system',
    title: '黑五促销活动即将开始',
    content: '11月24日黑五大促，超值折扣低至3折',
    isRead: true,
    time: '3天前',
  },
];

export default function NotificationsPage() {
  return (
    <div className="min-h-screen bg-bg-body">
      <div className="bg-bg-body text-center py-1 px-4 text-[11px] font-normal tracking-wider text-[#C0B2A9]/95">
        <span>信息由用户或商家提供本站核实后发布广告</span>
      </div>

      <Header />
      <NavBar />

      <main className="max-w-6xl mx-auto px-4 md:px-5 pb-10">
        <div className="py-6 flex items-center gap-2.5">
          <div className="w-1 h-5 bg-primary-500 rounded-sm"></div>
          <h1 className="text-xl font-bold text-text-primary">消息通知</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-border-light overflow-hidden">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-4 md:p-5 border-b border-border-light last:border-b-0 cursor-pointer transition-colors hover:bg-bg-hover ${
                !notif.isRead ? 'bg-primary-50/50' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5 text-primary-500">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-text-primary">
                      {notif.title}
                    </h3>
                    <span className="text-xs text-text-tertiary flex-shrink-0">{notif.time}</span>
                  </div>
                  <p className="text-sm text-text-secondary line-clamp-2">{notif.content}</p>
                </div>
                {!notif.isRead && (
                  <div className="w-2 h-2 bg-danger-500 rounded-full flex-shrink-0 mt-2"></div>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
