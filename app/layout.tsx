import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Watermelon Banking",
  description: "Sample banking simulator for balances, transfers, OTP authorization, and statements."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
