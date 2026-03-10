import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Tiến Lên Miền Nam - Card Game",
  description: "Chơi bài Tiến Lên Miền Nam online với bạn bè. 4 người chơi, real-time, miễn phí!",
  keywords: ["tiến lên", "miền nam", "card game", "bài", "online"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="dark">
      <body
        className={`${plusJakarta.variable} ${jetbrainsMono.variable} font-sans antialiased bg-primary text-primary min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
