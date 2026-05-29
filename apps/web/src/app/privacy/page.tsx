import type { Metadata } from "next";
import { PrivacyContent } from "@/components/legal/PrivacyContent";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "ConvertHub Privacy Policy — learn how we handle your files, data, and privacy with enterprise-grade security.",
};

export default function PrivacyPage() {
  return <PrivacyContent />;
}
