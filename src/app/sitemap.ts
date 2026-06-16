import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/blog";
import { getSiteUrl, publicRoutes } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getSiteUrl();
  const lastModified = new Date();

  const staticPages = publicRoutes.map(({ path, changeFrequency, priority }) => ({
    url: `${baseUrl}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));

  const blogPages = getAllPosts().map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.publishedAt),
    changeFrequency: "monthly" as const,
    priority: 0.75,
  }));

  return [...staticPages, ...blogPages];
}
