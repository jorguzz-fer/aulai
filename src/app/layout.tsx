import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aulai — Criador de Cursos com IA",
  description: "Esteira automática de criação e publicação de cursos no ClassOS",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
