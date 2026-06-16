import type { Metadata } from "next";
import {
  buildPageMetadata,
  buildFaqJsonLd,
  buildOrganizationJsonLd,
  buildSoftwareAppJsonLd,
  buildWebPageJsonLd,
  buildWebSiteJsonLd,
  siteConfig,
} from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import { LandingHome } from "@/components/landing/LandingHome";

export const metadata: Metadata = buildPageMetadata({
  title: `${siteConfig.name} — ${siteConfig.tagline}`,
  description: siteConfig.description,
  path: "",
});

export default function HomePage() {
  return (
    <>
      <JsonLd
        data={[
          buildWebSiteJsonLd(),
          buildOrganizationJsonLd(),
          buildSoftwareAppJsonLd(),
          buildWebPageJsonLd(
            "",
            `${siteConfig.name} — Free Group Expense Splitter`,
            siteConfig.description
          ),
          buildFaqJsonLd(),
        ]}
      />
      <LandingHome />
    </>
  );
}
