import type { Metadata } from "next";
import { FAQContent } from "@/components/legal/FAQContent";

export const metadata: Metadata = {
  title: "FAQ — Frequently Asked Questions",
  description:
    "Find answers to common questions about ConvertHub file conversion tools, security, privacy, and AI features.",
};

export default function FAQPage() {
  return <FAQContent />;
}
