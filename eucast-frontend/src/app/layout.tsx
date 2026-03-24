import type { Metadata } from "next";
import "./globals.css";
import BackgroundCanvas from "@/components/BackgroundCanvas";

export const metadata: Metadata = {
  title: "EUCAST Interpreter",
  description: "Interpretación de sensibilidad antibiótica según tablas EUCAST",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <BackgroundCanvas />
        {children}
      </body>
    </html>
  );
}
