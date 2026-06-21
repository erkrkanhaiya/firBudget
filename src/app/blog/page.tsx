import type { Metadata } from "next";
import Link from "next/link";
import { Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BlogBanner } from "@/components/blog/BlogBanner";
import { PublicPageShell } from "@/components/blog/PublicPageShell";
import { JsonLd } from "@/components/seo/JsonLd";
import { BLOG_HERO_IMAGE, getAllPosts } from "@/lib/blog";
import { buildPageMetadata, buildWebPageJsonLd, siteConfig } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Blog — Expense Splitting Tips & Guides",
  description:
    "Read BillBuddy blog articles on splitting bills with friends, roommate expense tracking, trip cost sharing, UPI bill split in India, and settling group debts fairly.",
  path: "/blog",
  keywords: [
    "expense splitting blog",
    "bill split tips",
    "group expense guides",
    "roommate expense tips",
    "trip expense advice",
  ],
  ogImage: {
    url: BLOG_HERO_IMAGE,
    width: 1200,
    height: 400,
    alt: "BillBuddy Blog — expense splitting tips and guides",
  },
});

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <PublicPageShell>
      <JsonLd
        data={buildWebPageJsonLd(
          "/blog",
          `${siteConfig.name} Blog`,
          "Tips and guides for splitting bills, tracking group expenses, and settling up fairly."
        )}
      />
      <main className="flex-1 py-12 md:py-16">
        <div className="container mx-auto max-w-6xl px-4">
          <BlogBanner
            src={BLOG_HERO_IMAGE}
            alt="BillBuddy Blog — expense splitting tips and guides"
            priority
            className="mb-12"
          />

          <div className="mx-auto mb-12 max-w-3xl text-center">
            <p className="mb-3 text-sm font-medium uppercase tracking-wider text-primary">
              BillBuddy Blog
            </p>
            <h1 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
              Expense splitting tips & guides
            </h1>
            <p className="text-lg text-muted-foreground">
              Practical advice on splitting bills with friends, tracking roommate costs,
              sharing trip expenses, and settling group debts — without the awkwardness.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <Card key={post.slug} className="flex flex-col overflow-hidden transition-shadow hover:shadow-md">
                <Link href={`/blog/${post.slug}`} className="block">
                  <BlogBanner src={post.coverImage} alt={post.title} className="rounded-none border-0 border-b" />
                </Link>
                <CardHeader>
                  <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
                      {post.category}
                    </span>
                    <span>{formatDate(post.publishedAt)}</span>
                  </div>
                  <CardTitle className="text-xl leading-snug">
                    <Link href={`/blog/${post.slug}`} className="hover:text-primary">
                      {post.title}
                    </Link>
                  </CardTitle>
                  <CardDescription className="line-clamp-3">{post.excerpt}</CardDescription>
                </CardHeader>
                <CardContent className="mt-auto flex items-center justify-between pt-0">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {post.readTimeMinutes} min read
                  </span>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                  >
                    Read more
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mx-auto mt-16 max-w-2xl rounded-xl border bg-muted/30 p-8 text-center">
            <h2 className="mb-2 text-2xl font-bold">Ready to split expenses fairly?</h2>
            <p className="mb-6 text-muted-foreground">
              Create a free group, add expenses, and let BillBuddy calculate who owes whom.
            </p>
            <Button asChild size="lg">
              <Link href="/signup">Get started free</Link>
            </Button>
          </div>
        </div>
      </main>
    </PublicPageShell>
  );
}
