const BLOG_IMAGE_WIDTH = 1200;
const BLOG_IMAGE_HEIGHT = 400;

type BlogBannerProps = {
  src: string;
  alt: string;
  priority?: boolean;
  className?: string;
};

export function BlogBanner({ src, alt, priority = false, className = "" }: BlogBannerProps) {
  return (
    <div className={`relative aspect-[3/1] w-full overflow-hidden rounded-xl border bg-muted/30 ${className}`}>
      {/* Native img — Next.js Image does not reliably render local SVG assets */}
      <img
        src={src}
        alt={alt}
        width={BLOG_IMAGE_WIDTH}
        height={BLOG_IMAGE_HEIGHT}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        className="block h-full w-full object-cover object-center"
      />
    </div>
  );
}

export { BLOG_IMAGE_WIDTH, BLOG_IMAGE_HEIGHT };
