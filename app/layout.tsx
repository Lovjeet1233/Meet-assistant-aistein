import '@/styles/globals.css';
import { Metadata } from 'next';
import { Inter } from 'next/font/google';

const fontSans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: {
    default: 'MeetAssistant',
    template: '%s · MeetAssistant',
  },
  icons: {
    icon: '/heygen-logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning className={`${fontSans.variable} font-sans`} lang="en">
      <body className="min-h-screen bg-secondary">
        <main className="relative flex min-h-screen w-full flex-col">{children}</main>
      </body>
    </html>
  );
}
