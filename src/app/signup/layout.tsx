import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Sign Up Free — Create Your Expense Splitter Account",
  description:
    "Create a free BillBuddy account to start splitting bills with friends. Track group expenses, calculate balances automatically, and settle up in USD or INR.",
  path: "/signup",
  keywords: [
    "BillBuddy sign up",
    "free expense splitter register",
    "create bill sharing account",
    "group expense app free",
    "split bills app signup",
  ],
});

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
