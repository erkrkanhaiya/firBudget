import type { BlogBlock } from "@/lib/blog";

export function BlogArticle({ blocks }: { blocks: BlogBlock[] }) {
  return (
    <article className="prose prose-neutral dark:prose-invert mx-auto max-w-none">
      {blocks.map((block, index) => {
        if (block.type === "h2") {
          return (
            <h2 key={index} className="mb-3 mt-8 text-2xl font-bold tracking-tight first:mt-0">
              {block.text}
            </h2>
          );
        }
        if (block.type === "p") {
          return (
            <p key={index} className="mb-4 leading-relaxed text-muted-foreground">
              {block.text}
            </p>
          );
        }
        return (
          <ul key={index} className="mb-4 ml-6 list-disc space-y-2 text-muted-foreground">
            {block.items.map((item, i) => (
              <li key={i} className="leading-relaxed">
                {item}
              </li>
            ))}
          </ul>
        );
      })}
    </article>
  );
}
