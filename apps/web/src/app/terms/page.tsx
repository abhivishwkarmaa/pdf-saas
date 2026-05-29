import type { Metadata } from "next";
import { TermsContent } from "@/components/legal/TermsContent";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "ConvertHub Terms of Service — understand your rights and responsibilities when using our platform.",
};

export default function TermsPage() {
  return <TermsContent />;
}
