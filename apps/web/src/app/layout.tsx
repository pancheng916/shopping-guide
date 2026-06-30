import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '今日折扣 - 海外华人省钱攻略',
  description: '今日折扣是面向海外华人的电商导购平台，汇聚亚马逊等平台的最新折扣信息，帮你省钱省心。',
  keywords: ['折扣', '优惠券', '亚马逊', '电商导购', '海外华人', '省钱'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-bg-body text-text-primary">
        {children}
      </body>
    </html>
  );
}
