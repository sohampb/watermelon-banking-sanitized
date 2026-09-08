import type { Metadata } from "next";
import "./banking.css";

export const metadata: Metadata = {
  title: "Watermelon Banking",
  description: "Sample banking simulator for balances, transfers, OTP authorization, and statements."
};

export default function BankingLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
