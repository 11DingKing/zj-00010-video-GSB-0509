import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '视频剪辑工具 - Video Editor',
  description: '网页端视频剪辑工具，支持多轨道编辑、特效添加、导出视频',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className="dark">
      <body>{children}</body>
    </html>
  );
}
