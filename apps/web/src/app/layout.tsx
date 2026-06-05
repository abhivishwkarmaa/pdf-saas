import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ErrorBoundary } from "@/components/layout/ErrorBoundary";
import { SuggestionsModal } from "@/components/suggestions/SuggestionsModal";

export const metadata: Metadata = {
  title: {
    default: "CONVERTHUB — Free Online File Converter",
    template: "%s | CONVERTHUB",
  },
  description:
    "Convert PDF, images, documents, and more. 70+ free tools, no registration required.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col bg-background font-sans text-foreground">
        <ThemeProvider>
          <ErrorBoundary>
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
            <SuggestionsModal />
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}

