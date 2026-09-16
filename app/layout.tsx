import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pesquisa de Clima | SUSTENCE",
  description: "Plataforma anônima de pesquisa de clima organizacional e socioeconômica.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
