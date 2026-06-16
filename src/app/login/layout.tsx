import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Log In — Access Your Expense Groups",
  description:
    "Log in to HisabKaro to manage group expenses, view balances, split bills, and settle up with friends and roommates. Free expense splitter app.",
  path: "/login",
  keywords: [
    "HisabKaro login",
    "expense splitter login",
    "bill sharing sign in",
    "group expense account",
  ],
});

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
