import type { Metadata } from "next";
import { Inter, Lexend } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const lexend = Lexend({ subsets: ["latin"], variable: "--font-lexend" });

export const metadata: Metadata = {
  title: "autoreplai — Responde reseñas de Google con IA",
  description:
    "Tus reseñas de Google respondidas automáticamente. Tú cocinas, nosotros contestamos.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={`${inter.variable} ${lexend.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
