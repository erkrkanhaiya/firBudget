import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BlogArticle } from "@/components/blog/BlogArticle";
import { BlogBanner } from "@/components/blog/BlogBanner";
import { PublicPageShell } from "@/components/blog/PublicPageShell";
import { JsonLd } from "@/components/seo/JsonLd";
import { getAllSlugs, getPostBySlug } from "@/lib/blog";
import {
  buildArticleJsonLd,
  buildBlogPostMetadata,
  buildWebPageJsonLd,
} from "@/lib/seo";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};

  return buildBlogPostMetadata({
    title: post.title,
    description: post.excerpt,
    slug: post.slug,
    keywords: post.keywords,
    publishedAt: post.publishedAt,
    author: post.author,
    coverImage: post.coverImage,
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  return (
    <PublicPageShell>
      <JsonLd
        data={[
          buildWebPageJsonLd(`/blog/${post.slug}`, post.title, post.excerpt),
          buildArticleJsonLd({
            title: post.title,
            description: post.excerpt,
            slug: post.slug,
            publishedAt: post.publishedAt,
            author: post.author,
            coverImage: post.coverImage,
            keywords: post.keywords,
          }),
        ]}
      />
      <main className="flex-1 py-10 md:py-14">
        <div className="container mx-auto max-w-3xl px-4">
          <Button asChild variant="ghost" size="sm" className="mb-6 -ml-2">
            <Link href="/blog">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to blog
            </Link>
          </Button>

          <BlogBanner
            src={post.coverImage}
            alt={post.title}
            priority
            className="mb-8"
          />

          <header className="mb-10 border-b pb-8">
            <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-medium text-primary">
                {post.category}
              </span>
              <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {post.readTimeMinutes} min read
              </span>
            </div>
            <h1 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
              {post.title}
            </h1>
            <p className="text-lg leading-relaxed text-muted-foreground">{post.excerpt}</p>
          </header>

          <BlogArticle blocks={post.blocks} />

          <div className="mt-12 rounded-xl border bg-muted/30 p-8 text-center">
            <h2 className="mb-2 text-xl font-bold">Try HisabKaro free</h2>
            <p className="mb-6 text-muted-foreground">
              Split bills with friends, track group expenses, and settle up in minutes.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button asChild>
                <Link href="/signup">Create free account</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/">Learn more</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>
    </PublicPageShell>
  );
}
