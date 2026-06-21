import type { Metadata } from "next";

/** Resolve the canonical site URL for SEO, sitemap, and robots. */
export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;

  const vercelUrl = process.env.VERCEL_URL?.replace(/\/$/, "");
  if (vercelUrl) return `https://${vercelUrl}`;

  return "https://billbuddy.vercel.app";
}

export const siteConfig = {
  name: "BillBuddy",
  tagline: "Free Group Expense Splitter & Bill Sharing App",
  description:
    "BillBuddy is a free expense splitter app to track shared bills, split costs with friends and roommates, calculate group balances automatically, and settle up via UPI or cash. Supports USD & INR.",
  get url() {
    return getSiteUrl();
  },
  email: "support@billbuddy.vercel.app",
  locale: "en_US",
  twitterHandle: "@billbuddy",
} as const;

/** Primary & long-tail keywords for search ranking */
export const seoKeywords = [
  // Core product
  "expense splitter",
  "split bills app",
  "group expense tracker",
  "shared expense app",
  "bill splitting app",
  "bill sharing app",
  "group expense sharing",
  "BillBuddy",
  "bill buddy",
  "bill buddy app",

  // Use cases
  "split bills with friends",
  "roommate expense tracker",
  "trip expense splitter",
  "group travel expenses",
  "vacation expense tracker",
  "shared rent calculator",
  "household expense tracker",
  "couple expense splitter",
  "office lunch expense split",
  "event expense sharing",
  "party bill splitter",

  // Features
  "settle up app",
  "who owes whom calculator",
  "expense balance calculator",
  "split bill equally",
  "custom expense split",
  "receipt scanner expense app",
  "AI receipt scanning",
  "group payment tracker",

  // India / currency
  "UPI expense split",
  "UPI bill split India",
  "INR expense tracker",
  "USD expense splitter",
  "India bill splitter app",

  // Intent-based
  "free expense sharing app",
  "free group finance app",
  "track shared expenses online",
  "manage group money",
  "split costs fairly",
  "transparent expense tracking",
];

export const publicRoutes = [
  { path: "/", changeFrequency: "weekly" as const, priority: 1 },
  { path: "/blog", changeFrequency: "weekly" as const, priority: 0.85 },
  { path: "/about", changeFrequency: "monthly" as const, priority: 0.8 },
  { path: "/contact", changeFrequency: "monthly" as const, priority: 0.7 },
  { path: "/signup", changeFrequency: "monthly" as const, priority: 0.9 },
  { path: "/login", changeFrequency: "monthly" as const, priority: 0.6 },
];

export const faqItems = [
  {
    question: "What is BillBuddy?",
    answer:
      "BillBuddy is a free group expense splitter and bill sharing app. It helps friends, roommates, and travel groups track shared expenses, split bills fairly, calculate who owes whom, and settle up easily.",
  },
  {
    question: "Is BillBuddy free to use?",
    answer:
      "Yes. BillBuddy is free to start. You can create groups, add expenses, view balances, and settle up without any subscription or credit card.",
  },
  {
    question: "Can I split bills unequally or by custom amounts?",
    answer:
      "Yes. BillBuddy supports equal splits and custom splits. Assign specific amounts to each member so the total always matches the expense.",
  },
  {
    question: "Does BillBuddy support UPI and INR?",
    answer:
      "Yes. BillBuddy supports INR (₹) and USD ($) currencies. You can record UPI, cash, and bank transfer settlements in your group payment history.",
  },
  {
    question: "Who can use BillBuddy?",
    answer:
      "Anyone sharing costs — roommates splitting rent, friends on trips, couples managing household bills, teams tracking office lunches, or groups organizing events.",
  },
  {
    question: "How does BillBuddy calculate balances?",
    answer:
      "BillBuddy automatically calculates net balances from all group expenses, contributions, and settlement payments. You always see an up-to-date view of who owes whom.",
  },
];

type PageSeoOptions = {
  title: string;
  description: string;
  path?: string;
  keywords?: string[];
  noIndex?: boolean;
  ogImage?: {
    url: string;
    width: number;
    height: number;
    alt?: string;
  };
};

export function buildPageMetadata({
  title,
  description,
  path = "",
  keywords = [],
  noIndex = false,
  ogImage,
}: PageSeoOptions): Metadata {
  const url = `${siteConfig.url}${path}`;
  const fullTitle = path === "" || path === "/"
    ? title
    : `${title} | ${siteConfig.name}`;

  const allKeywords = [...new Set([...seoKeywords, ...keywords])];
  const image = ogImage ?? {
    url: `${siteConfig.url}/icon-512x512.png`,
    width: 512,
    height: 512,
    alt: `${siteConfig.name} — ${siteConfig.tagline}`,
  };
  const imageUrl = image.url.startsWith("http") ? image.url : `${siteConfig.url}${image.url}`;

  return {
    title: fullTitle,
    description,
    keywords: allKeywords,
    authors: [{ name: siteConfig.name, url: siteConfig.url }],
    creator: siteConfig.name,
    publisher: siteConfig.name,
    metadataBase: new URL(siteConfig.url),
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true, googleBot: { index: true, follow: true } },
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      locale: siteConfig.locale,
      url,
      siteName: siteConfig.name,
      title: fullTitle,
      description,
      images: [
        {
          url: imageUrl,
          width: image.width,
          height: image.height,
          alt: image.alt ?? fullTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [imageUrl],
    },
    category: "Finance",
  };
}

export function buildOrganizationJsonLd() {
  return {
    "@type": "Organization",
    "@id": `${siteConfig.url}/#organization`,
    name: siteConfig.name,
    url: siteConfig.url,
    logo: {
      "@type": "ImageObject",
      url: `${siteConfig.url}/icon-512x512.png`,
      width: 512,
      height: 512,
    },
    description: siteConfig.description,
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: siteConfig.email,
      availableLanguage: ["English", "Hindi"],
    },
  };
}

export function buildWebSiteJsonLd() {
  return {
    "@type": "WebSite",
    "@id": `${siteConfig.url}/#website`,
    url: siteConfig.url,
    name: siteConfig.name,
    description: siteConfig.description,
    publisher: { "@id": `${siteConfig.url}/#organization` },
    inLanguage: "en-US",
  };
}

export function buildSoftwareAppJsonLd() {
  return {
    "@type": "SoftwareApplication",
    name: siteConfig.name,
    applicationCategory: "FinanceApplication",
    applicationSubCategory: "Expense Tracker",
    operatingSystem: "Web, iOS, Android",
    url: siteConfig.url,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    description: siteConfig.description,
    featureList: [
      "Group expense tracking",
      "Automatic balance calculation",
      "Equal and custom bill split",
      "Settle up with UPI, cash, or bank transfer",
      "AI receipt scanning",
      "USD and INR currency support",
      "Private and public groups",
      "Activity log and payment history",
    ],
    keywords: seoKeywords.slice(0, 20).join(", "),
  };
}

export function buildFaqJsonLd() {
  return {
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function buildWebPageJsonLd(path: string, name: string, description: string) {
  const url = `${siteConfig.url}${path}`;
  return {
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    url,
    name,
    description,
    isPartOf: { "@id": `${siteConfig.url}/#website` },
    about: { "@id": `${siteConfig.url}/#organization` },
    inLanguage: "en-US",
  };
}

type BlogPostSeoOptions = {
  title: string;
  description: string;
  slug: string;
  keywords: string[];
  publishedAt: string;
  author: string;
  coverImage: string;
};

export function buildBlogPostMetadata({
  title,
  description,
  slug,
  keywords,
  publishedAt,
  author,
  coverImage,
}: BlogPostSeoOptions): Metadata {
  const path = `/blog/${slug}`;
  const url = `${siteConfig.url}${path}`;
  const fullTitle = `${title} | ${siteConfig.name}`;
  const allKeywords = [...new Set([...seoKeywords, ...keywords])];
  const imageUrl = `${siteConfig.url}${coverImage}`;

  return {
    title: fullTitle,
    description,
    keywords: allKeywords,
    authors: [{ name: author }],
    creator: siteConfig.name,
    publisher: siteConfig.name,
    metadataBase: new URL(siteConfig.url),
    robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      locale: siteConfig.locale,
      url,
      siteName: siteConfig.name,
      title: fullTitle,
      description,
      publishedTime: publishedAt,
      authors: [author],
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 400,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [imageUrl],
    },
    category: "Finance",
  };
}

export function buildArticleJsonLd({
  title,
  description,
  slug,
  publishedAt,
  author,
  coverImage,
}: BlogPostSeoOptions) {
  const url = `${siteConfig.url}/blog/${slug}`;
  return {
    "@type": "Article",
    "@id": `${url}#article`,
    headline: title,
    description,
    url,
    image: `${siteConfig.url}${coverImage}`,
    datePublished: publishedAt,
    dateModified: publishedAt,
    author: {
      "@type": "Organization",
      name: author,
    },
    publisher: { "@id": `${siteConfig.url}/#organization` },
    isPartOf: { "@id": `${siteConfig.url}/blog#webpage` },
    inLanguage: "en-US",
    mainEntityOfPage: { "@id": `${url}#webpage` },
  };
}
