"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  ChevronDown,
  ChevronRight,
  MessageCircle,
  Zap,
  Video,
  Image,
  FileText,
  Shield,
  Upload,
  CreditCard,
  Wrench,
  Code2,
  Sparkles,
  Star,
  ArrowRight,
  HelpCircle,
  ThumbsUp,
  ThumbsDown,
  Mail,
  Globe,
  CheckCircle2,
  X,
} from "lucide-react";

// ─── FAQ Data ─────────────────────────────────────────────────────────────────

type FaqItem = {
  id: string;
  question: string;
  answer: string;
  popular?: boolean;
  tags?: string[];
};

type FaqCategory = {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  count: number;
  items: FaqItem[];
};

const FAQ_DATA: FaqCategory[] = [
  {
    id: "general",
    label: "General Questions",
    icon: HelpCircle,
    color: "text-violet-400",
    bgColor: "bg-violet-500/10",
    borderColor: "border-violet-500/20",
    count: 6,
    items: [
      {
        id: "g1",
        question: "What is ConvertHub?",
        answer:
          "ConvertHub is an AI-powered online platform that provides modern file conversion, image editing, video editing, compression, and productivity tools — all in one place. With 70+ free tools covering PDF, image, video, audio, text, and developer utilities, ConvertHub is the ultimate all-in-one file processing solution. No signup required for most tools.",
        popular: true,
        tags: ["intro", "platform"],
      },
      {
        id: "g2",
        question: "Is ConvertHub free to use?",
        answer:
          "Yes! ConvertHub offers a generous free tier that covers most use cases. Free users can access all core tools including PDF conversion, image compression, video conversion, and basic AI features. Optional premium plans unlock larger file sizes, batch processing, advanced AI tools, and priority processing queues.",
        popular: true,
        tags: ["pricing", "free"],
      },
      {
        id: "g3",
        question: "Do I need to install any software?",
        answer:
          "No installation required. All ConvertHub tools work directly in your web browser. Simply visit the tool page, upload your file, and get your result — no plugins, no downloads, no desktop app needed. Everything runs on our secure cloud infrastructure.",
        popular: true,
        tags: ["software", "browser"],
      },
      {
        id: "g4",
        question: "Which devices and browsers are supported?",
        answer:
          "ConvertHub is fully responsive and works on desktop, laptop, tablet, and mobile devices. We officially support the latest versions of Google Chrome, Microsoft Edge, Mozilla Firefox, and Apple Safari. For the best experience with video editing and AI tools, we recommend Chrome or Edge on a desktop.",
        tags: ["devices", "browser", "mobile"],
      },
      {
        id: "g5",
        question: "How many tools does ConvertHub offer?",
        answer:
          "ConvertHub currently offers 70+ free tools across 8 categories: PDF Tools, Image Tools, Video Tools, Audio Tools, Text Tools, Developer Tools, AI Tools, and Calculators. New tools are added regularly based on community requests and usage trends.",
        tags: ["tools", "features"],
      },
      {
        id: "g6",
        question: "Can I use ConvertHub for commercial projects?",
        answer:
          "Yes. Converted and processed files belong entirely to you. You may use the outputs for personal, professional, or commercial projects. ConvertHub does not claim any ownership or rights over your files or converted outputs.",
        tags: ["commercial", "rights", "license"],
      },
    ],
  },
  {
    id: "video",
    label: "Video Tools",
    icon: Video,
    color: "text-fuchsia-400",
    bgColor: "bg-fuchsia-500/10",
    borderColor: "border-fuchsia-500/20",
    count: 6,
    items: [
      {
        id: "v1",
        question: "Which video formats does ConvertHub support?",
        answer:
          "ConvertHub supports a wide range of video formats for both input and output: MP4, MOV, AVI, MKV, WEBM, FLV, WMV, 3GP, TS, GIF, and more. Our video converter handles virtually any video format you throw at it, powered by a server-side FFmpeg processing engine.",
        popular: true,
        tags: ["formats", "mp4", "mov"],
      },
      {
        id: "v2",
        question: "Can I compress videos without losing quality?",
        answer:
          "Yes. Our AI-powered video compression engine analyzes your video content and intelligently reduces file size while maintaining high visual quality. You can choose between lossless, high quality, balanced, or maximum compression presets. Typical compression rates are 40–70% size reduction with minimal perceptible quality loss.",
        tags: ["compression", "quality", "ai"],
      },
      {
        id: "v3",
        question: "Does ConvertHub support batch video conversion?",
        answer:
          "Yes. The Video Editor and Video Converter support multiple file uploads simultaneously. Free users can process up to 3 files concurrently, while premium users can process larger batches with priority queue access.",
        tags: ["batch", "multiple", "concurrent"],
      },
      {
        id: "v4",
        question: "What can I do with the online Video Editor?",
        answer:
          "The ConvertHub Video Editor is a full-featured browser-based editor with: multi-track timeline editing, video trimming and splitting, clip dragging and reordering, background music and audio import, volume control per track, AI auto-caption generation, text overlays at any point on the timeline, transition effects (fade, crossfade, zoom, wipe, slide), cinematic color filters, speed control (0.25x–4x), and export in MP4, MOV, WEBM, or GIF.",
        popular: true,
        tags: ["editor", "timeline", "captions"],
      },
      {
        id: "v5",
        question: "How does AI subtitle generation work?",
        answer:
          "Our AI Auto-Captions feature uses speech-to-text technology to analyze the audio track of your video and automatically generate time-aligned subtitle entries. You can then edit each caption inline, adjust timing, change text color and font size, and position captions at the top, middle, or bottom of the video. Captions are included in the exported video.",
        tags: ["subtitles", "captions", "ai", "speech-to-text"],
      },
      {
        id: "v6",
        question: "What is the maximum video file size I can upload?",
        answer:
          "Free users can upload video files up to 500 MB per file. Premium users can upload files up to 2 GB. For very large files (broadcast quality, 4K RAW), we recommend using the batch processing API available in enterprise plans.",
        tags: ["size", "limit", "upload"],
      },
    ],
  },
  {
    id: "image",
    label: "Image Tools",
    icon: Image,
    color: "text-sky-400",
    bgColor: "bg-sky-500/10",
    borderColor: "border-sky-500/20",
    count: 5,
    items: [
      {
        id: "i1",
        question: "Can I remove image backgrounds automatically?",
        answer:
          "Yes. The ConvertHub AI Background Remover uses a machine learning model to automatically detect the subject in your image and remove the background in seconds. Works best on photos with a clear subject (portraits, product photos, logos). You can fine-tune the result or export with a transparent background as PNG.",
        popular: true,
        tags: ["background", "ai", "transparent"],
      },
      {
        id: "i2",
        question: "Which image formats are supported?",
        answer:
          "ConvertHub supports all major image formats: JPEG/JPG, PNG, WEBP, SVG, GIF, BMP, TIFF, AVIF, HEIC, and ICO. You can convert between any of these formats, with options to control quality, resolution, and color profile.",
        tags: ["formats", "jpg", "png", "webp"],
      },
      {
        id: "i3",
        question: "What can I do with the Image Editor?",
        answer:
          "The ConvertHub Image Editor is a Canva-style browser-based editor featuring: layer-based canvas (images, text, shapes, stickers), drag-to-move and rotation for every layer, undo/redo with 50-step history, 8 filter presets (Vivid, Noir, Vintage, Warm, etc.), per-layer adjustments (brightness, contrast, saturation, blur, hue, sepia, grayscale, invert), AI background removal and AI enhancement, canvas size presets (Instagram, Facebook, A4, HD), and PNG/JPG/WEBP export.",
        popular: true,
        tags: ["editor", "layers", "filters", "canva"],
      },
      {
        id: "i4",
        question: "Does ConvertHub support smart image compression?",
        answer:
          "Yes. Our intelligent image compression reduces file size by 40–80% while preserving visual quality. You can choose the compression level and preview the output quality before downloading. Supports JPEG, PNG, and WEBP compression with lossless or lossy options.",
        tags: ["compression", "optimize", "size"],
      },
      {
        id: "i5",
        question: "Can I bulk convert images to another format?",
        answer:
          "Yes. The image converter supports multi-file uploads, allowing you to convert dozens of images at once from one format to another (e.g., all JPGs to WEBP). Converted files are packaged into a ZIP archive for convenient download.",
        tags: ["bulk", "batch", "convert"],
      },
    ],
  },
  {
    id: "pdf",
    label: "PDF Tools",
    icon: FileText,
    color: "text-rose-400",
    bgColor: "bg-rose-500/10",
    borderColor: "border-rose-500/20",
    count: 5,
    items: [
      {
        id: "p1",
        question: "Which formats can I convert PDF to?",
        answer:
          "ConvertHub supports converting PDF to: Word (DOCX), Excel (XLSX), PowerPoint (PPTX), JPG, PNG, WEBP, HTML, TXT, and more. You can also convert from Word, Excel, images, and HTML back to PDF.",
        popular: true,
        tags: ["pdf", "word", "convert", "docx"],
      },
      {
        id: "p2",
        question: "Is PDF processing secure and private?",
        answer:
          "Absolutely. All uploaded PDF files are encrypted during transit using TLS 1.3. Files are processed in isolated containers with no access to other users' files. No ConvertHub employee can read your document contents. Files are automatically deleted within 1 hour of processing completion.",
        popular: true,
        tags: ["security", "privacy", "encrypt"],
      },
      {
        id: "p3",
        question: "Can I merge multiple PDFs into one?",
        answer:
          "Yes. The PDF Merge tool lets you upload multiple PDF files, drag to reorder them, and merge them into a single PDF in seconds. You can merge up to 20 PDFs at once on the free plan.",
        tags: ["merge", "combine", "multiple"],
      },
      {
        id: "p4",
        question: "Can I password-protect a PDF?",
        answer:
          "Yes. The PDF Protect tool adds 128-bit or 256-bit AES password encryption to any PDF. You can set both an owner password (edit/print restrictions) and a user password (open restriction). The Unlock PDF tool can remove passwords from PDFs you own.",
        tags: ["protect", "password", "encrypt", "lock"],
      },
      {
        id: "p5",
        question: "Does the OCR tool work on scanned PDFs?",
        answer:
          "Yes. ConvertHub's OCR (Optical Character Recognition) tool can extract text from scanned PDFs and image-based documents. It supports over 60 languages and can output the recognized text as a searchable PDF, Word document, or plain text.",
        tags: ["ocr", "scan", "text", "recognition"],
      },
    ],
  },
  {
    id: "ai",
    label: "AI Features",
    icon: Sparkles,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
    count: 5,
    items: [
      {
        id: "a1",
        question: "What AI tools are available on ConvertHub?",
        answer:
          "ConvertHub offers a growing suite of AI-powered tools: AI Background Remover (remove backgrounds from images), AI Image Enhancer (auto-improve quality, sharpness, colors), AI Video Enhancer (upscale and improve video quality), AI Auto-Captions (generate subtitles from video audio), AI Smart Compression (optimize files with content-aware algorithms), and AI Thumbnail Generator (create video thumbnails).",
        popular: true,
        tags: ["ai", "features", "tools"],
      },
      {
        id: "a2",
        question: "How does AI compression work?",
        answer:
          "Our AI compression algorithm analyzes the content of your file — for images it detects regions of detail vs. uniform areas; for videos it analyzes motion complexity and scene changes. It then selectively applies higher compression in less-important regions while preserving detail where the human eye is most sensitive. This typically achieves 30–60% better compression than traditional methods at equivalent quality.",
        tags: ["compression", "algorithm", "quality"],
      },
      {
        id: "a3",
        question: "Are AI tools included in the free plan?",
        answer:
          "Basic AI tools (AI background removal, AI auto-captions, AI enhancement) are available to free users with some daily usage limits. Advanced AI features like AI video upscaling, AI batch processing, and priority AI inference are available in premium plans.",
        tags: ["free", "premium", "limits"],
      },
      {
        id: "a4",
        question: "Are my files used to train AI models?",
        answer:
          "No. Your files are never used to train ConvertHub's AI models without your explicit written consent. All AI processing is purely for delivering the service you requested. Files are deleted automatically after processing and are never stored in training datasets.",
        popular: true,
        tags: ["privacy", "training", "data"],
      },
      {
        id: "a5",
        question: "How accurate is AI auto-caption generation?",
        answer:
          "AI auto-captions are typically 85–95% accurate for clear English speech. Accuracy may vary with accents, background noise, multiple speakers, or technical jargon. We always recommend reviewing and editing captions before publishing. The Video Editor makes it easy to edit any caption inline.",
        tags: ["accuracy", "captions", "subtitles"],
      },
    ],
  },
  {
    id: "security",
    label: "Security & Privacy",
    icon: Shield,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/20",
    count: 5,
    items: [
      {
        id: "s1",
        question: "Are my uploaded files secure?",
        answer:
          "Yes. All file transfers use TLS 1.3 encryption (the strongest available). Files are stored in AES-256 encrypted cloud storage during processing. Each conversion runs in an isolated container — your files are never mixed with other users' files. No human employee can access your file contents.",
        popular: true,
        tags: ["security", "encryption", "safe"],
      },
      {
        id: "s2",
        question: "How long are files stored on ConvertHub?",
        answer:
          "Files are NOT stored permanently. Input files are deleted within 5 minutes of conversion completion. Output files are available for download for 1 hour, then automatically deleted. You can also manually delete files immediately after downloading using the provided delete link.",
        tags: ["storage", "delete", "retention"],
      },
      {
        id: "s3",
        question: "Does ConvertHub share my data with third parties?",
        answer:
          "No. ConvertHub never sells, rents, or shares your personal data or file contents with third parties for advertising or commercial purposes. We use minimal trusted service providers (Cloudflare for CDN, AWS for storage) who are bound by strict data processing agreements.",
        popular: true,
        tags: ["data", "sharing", "privacy"],
      },
      {
        id: "s4",
        question: "Is ConvertHub GDPR compliant?",
        answer:
          "Yes. ConvertHub is designed to be GDPR compliant for European users. This includes: minimal data collection, auto-deletion policies, no selling of personal data, right to erasure requests, and transparent privacy policies. For GDPR requests, contact privacy@converthub.io.",
        tags: ["gdpr", "compliance", "europe"],
      },
      {
        id: "s5",
        question: "Does ConvertHub use HTTPS/SSL?",
        answer:
          "Yes. All connections to ConvertHub are protected by HTTPS with TLS 1.3. Our SSL certificate is maintained by Cloudflare with automatic renewal. You can verify the padlock icon in your browser's address bar on any ConvertHub page.",
        tags: ["https", "ssl", "tls"],
      },
    ],
  },
  {
    id: "uploads",
    label: "Upload & File Limits",
    icon: Upload,
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-500/20",
    count: 4,
    items: [
      {
        id: "u1",
        question: "What is the maximum file size I can upload?",
        answer:
          "File size limits depend on the tool and your plan: Free users: up to 100 MB for most tools, 500 MB for video. Premium users: up to 2 GB per file. Enterprise: custom limits up to 10 GB. If your file exceeds the limit, you'll see a clear error message with upgrade options.",
        popular: true,
        tags: ["size", "limit", "upload"],
      },
      {
        id: "u2",
        question: "Which file formats are accepted?",
        answer:
          "ConvertHub accepts virtually all common file formats. PDF, DOCX, XLSX, PPTX for documents; JPG, PNG, WEBP, GIF, SVG, BMP for images; MP4, MOV, AVI, MKV, WEBM for video; MP3, WAV, AAC, FLAC for audio. Each tool page lists the exact accepted formats for that specific conversion.",
        tags: ["formats", "accepted", "supported"],
      },
      {
        id: "u3",
        question: "Can I upload multiple files at once?",
        answer:
          "Yes, most tools support multi-file uploads. Drag and drop multiple files onto the upload zone, or use the file picker to select multiple files. Free users can process up to 3 files simultaneously; premium users can process larger batches. Batch outputs are packaged into a ZIP archive.",
        tags: ["multiple", "batch", "drag-drop"],
      },
      {
        id: "u4",
        question: "Why is my upload failing or slow?",
        answer:
          "Upload issues are usually caused by: (1) File size exceeding the plan limit — upgrade or reduce file size; (2) Unsupported file format — check the tool's accepted formats; (3) Slow internet connection — try again on a faster network; (4) Browser extensions blocking uploads — try in incognito mode; (5) Server maintenance — check our status page at status.converthub.io.",
        tags: ["error", "troubleshoot", "slow"],
      },
    ],
  },
  {
    id: "billing",
    label: "Account & Billing",
    icon: CreditCard,
    color: "text-indigo-400",
    bgColor: "bg-indigo-500/10",
    borderColor: "border-indigo-500/20",
    count: 4,
    items: [
      {
        id: "b1",
        question: "Do I need an account to use ConvertHub?",
        answer:
          "No. Most ConvertHub tools work without any account or signup. Simply visit a tool page and start converting. Creating a free account gives you benefits like conversion history, saved preferences, larger file limits, and access to premium features.",
        tags: ["account", "signup", "free"],
      },
      {
        id: "b2",
        question: "What premium benefits are available?",
        answer:
          "Premium plans include: larger file upload limits (up to 2 GB), faster processing with priority queue access, unlimited conversions per day, batch processing with no concurrency limits, advanced AI tools (video upscaling, AI thumbnail generation), API access for developers, and dedicated support.",
        popular: true,
        tags: ["premium", "pro", "benefits"],
      },
      {
        id: "b3",
        question: "Which payment methods are supported?",
        answer:
          "ConvertHub accepts all major credit/debit cards (Visa, Mastercard, Amex), PayPal, Google Pay, Apple Pay, and UPI (for Indian users). All payments are processed securely through Stripe. We never store your payment card details.",
        tags: ["payment", "stripe", "card"],
      },
      {
        id: "b4",
        question: "Can I cancel my subscription anytime?",
        answer:
          "Yes. You can cancel your premium subscription at any time from your account settings. Cancellation takes effect at the end of your current billing period. You'll retain premium access until the period ends. We offer a 14-day refund for new subscribers if you're not satisfied.",
        tags: ["cancel", "refund", "subscription"],
      },
    ],
  },
  {
    id: "troubleshoot",
    label: "Troubleshooting",
    icon: Wrench,
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/20",
    count: 4,
    items: [
      {
        id: "t1",
        question: "Why is my conversion taking too long?",
        answer:
          "Processing time depends on several factors: file size and complexity, output format (some formats require more computation), current server load, and your internet connection speed for uploading/downloading. Large video files can take 5–15 minutes on free plans. Premium users have priority queue access for faster processing.",
        tags: ["slow", "processing", "time"],
      },
      {
        id: "t2",
        question: "My converted file quality is poor — what can I do?",
        answer:
          "If output quality is lower than expected: (1) Check your selected quality/compression settings — choose 'High Quality' preset; (2) For images, avoid upscaling beyond the original resolution; (3) For PDF conversions, the source document quality affects output; (4) Try using AI Enhancement tools to improve quality after conversion. If the issue persists, contact support with your file details.",
        tags: ["quality", "poor", "output"],
      },
      {
        id: "t3",
        question: "Which browsers work best with ConvertHub?",
        answer:
          "ConvertHub is fully tested on: Google Chrome 110+ (recommended), Microsoft Edge 110+, Mozilla Firefox 110+, and Apple Safari 16+. For the best performance with the Video Editor and AI tools, use Chrome or Edge on a desktop device. Mobile browsers are supported but some advanced editor features work best on desktop.",
        tags: ["browser", "chrome", "firefox", "safari"],
      },
      {
        id: "t4",
        question: "I can't download my converted file — what should I do?",
        answer:
          "If download fails: (1) Check if the 1-hour download window has expired — you may need to re-convert; (2) Disable pop-up blockers which may block download dialogs; (3) Check your browser's Downloads folder — the file may have downloaded automatically; (4) Try right-clicking the download button and selecting 'Save link as'; (5) Contact support if the issue persists.",
        tags: ["download", "error", "expired"],
      },
    ],
  },
  {
    id: "developer",
    label: "Developer & API",
    icon: Code2,
    color: "text-teal-400",
    bgColor: "bg-teal-500/10",
    borderColor: "border-teal-500/20",
    count: 3,
    items: [
      {
        id: "d1",
        question: "Does ConvertHub provide an API?",
        answer:
          "Yes. ConvertHub offers a REST API that allows developers to integrate file conversion and AI tools directly into their own applications. The API supports all conversion formats, AI processing features, async job queuing, and webhook callbacks for completed jobs. API documentation is available at docs.converthub.io.",
        tags: ["api", "rest", "developer"],
      },
      {
        id: "d2",
        question: "Is API access included in premium plans?",
        answer:
          "API access is available in Developer and Enterprise plans. The Developer plan includes up to 10,000 API calls/month. Enterprise plans have custom API quotas, SLA guarantees, dedicated infrastructure, and priority support. Contact sales@converthub.io for enterprise pricing.",
        tags: ["api", "premium", "enterprise"],
      },
      {
        id: "d3",
        question: "What authentication does the API use?",
        answer:
          "The ConvertHub API uses API key authentication. After subscribing to a Developer or Enterprise plan, you'll receive a unique API key from your account dashboard. Include your API key in the Authorization header of every request. Keys can be rotated or revoked from your account settings at any time.",
        tags: ["auth", "api-key", "security"],
      },
    ],
  },
];

const POPULAR_FAQS = FAQ_DATA.flatMap((cat) =>
  cat.items.filter((item) => item.popular)
).slice(0, 6);

// ─── Main Component ───────────────────────────────────────────────────────────

export function FAQContent() {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [helpfulVotes, setHelpfulVotes] = useState<Record<string, "up" | "down">>({});
  const searchRef = useRef<HTMLInputElement>(null);

  const toggleItem = (id: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const vote = (id: string, type: "up" | "down") => {
    setHelpfulVotes((prev) => ({ ...prev, [id]: type }));
  };

  // Filtered + searched items
  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return FAQ_DATA.map((cat) => ({
      ...cat,
      items: cat.items.filter((item) => {
        const matchCat = activeCategory === "all" || activeCategory === cat.id;
        const matchSearch =
          !q ||
          item.question.toLowerCase().includes(q) ||
          item.answer.toLowerCase().includes(q) ||
          item.tags?.some((t) => t.includes(q));
        return matchCat && matchSearch;
      }),
    })).filter((cat) => cat.items.length > 0);
  }, [activeCategory, searchQuery]);

  const totalResults = filtered.reduce((n, cat) => n + cat.items.length, 0);

  // Keyboard shortcut: / to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      {/* JSON-LD FAQ Schema for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: POPULAR_FAQS.map((faq) => ({
              "@type": "Question",
              name: faq.question,
              acceptedAnswer: { "@type": "Answer", text: faq.answer },
            })),
          }),
        }}
      />

      <div className="min-h-screen bg-zinc-950 text-white">
        {/* Hero Section */}
        <div className="relative border-b border-zinc-800 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(124,58,237,0.2),transparent)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_80%_at_80%_50%,rgba(236,72,153,0.08),transparent)]" />

          <div className="relative mx-auto max-w-4xl px-4 py-20 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-violet-500/10 border border-violet-500/20 px-4 py-1.5 text-sm font-medium text-violet-300 mb-5">
              <HelpCircle className="h-3.5 w-3.5" />
              Help Center
            </div>
            <h1 className="text-5xl font-extrabold tracking-tight mb-4 bg-gradient-to-br from-white via-white to-zinc-400 bg-clip-text text-transparent">
              Frequently Asked
              <br />
              <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
                Questions
              </span>
            </h1>
            <p className="text-zinc-400 text-lg mb-8 max-w-xl mx-auto">
              Everything you need to know about ConvertHub. Can&apos;t find what you&apos;re looking for?{" "}
              <Link href="/contact" className="text-violet-400 hover:text-violet-300 underline underline-offset-4 transition">
                Contact support
              </Link>
            </p>

            {/* Search Bar */}
            <div className="relative max-w-lg mx-auto">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <Search className="h-4 w-4 text-zinc-500" />
              </div>
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search questions... (press / to focus)"
                className="w-full rounded-2xl bg-zinc-900 border border-zinc-700 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 text-white placeholder-zinc-600 pl-12 pr-12 py-4 text-sm outline-none transition-all shadow-xl"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              {/* Keyboard shortcut hint */}
              {!searchQuery && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 rounded bg-zinc-800 px-1.5 py-0.5">
                  <span className="text-[10px] text-zinc-500 font-mono">/</span>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="flex items-center justify-center gap-6 mt-6 text-sm text-zinc-500">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                {FAQ_DATA.reduce((n, c) => n + c.items.length, 0)} questions answered
              </span>
              <span className="flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-blue-400" />
                {FAQ_DATA.length} categories
              </span>
              <span className="flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-amber-400" />
                Updated May 2026
              </span>
            </div>
          </div>
        </div>

        {/* Popular Questions */}
        {!searchQuery && activeCategory === "all" && (
          <div className="mx-auto max-w-5xl px-4 py-10">
            <div className="flex items-center gap-2 mb-5">
              <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
              <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400">
                Popular Questions
              </h2>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {POPULAR_FAQS.map((faq) => (
                <button
                  key={faq.id}
                  onClick={() => {
                    setOpenItems((p) => new Set([...p, faq.id]));
                    setTimeout(() => {
                      document.getElementById(`faq-${faq.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
                    }, 100);
                  }}
                  className="group text-left rounded-xl border border-zinc-800 bg-zinc-900/60 hover:border-violet-500/50 hover:bg-zinc-900 p-4 transition-all duration-200 hover:shadow-lg hover:shadow-violet-900/20"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-500/10 border border-violet-500/20">
                      <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                    </div>
                    <p className="text-sm text-zinc-300 group-hover:text-white transition-colors leading-snug">
                      {faq.question}
                    </p>
                  </div>
                  <div className="mt-2 ml-9 flex items-center gap-1 text-xs text-violet-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    View answer <ArrowRight className="h-3 w-3" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Main content area */}
        <div className="mx-auto max-w-7xl px-4 pb-20 lg:flex lg:gap-8">
          {/* Category Sidebar */}
          <aside className="shrink-0 lg:w-56">
            <div className="lg:sticky lg:top-20 space-y-1.5 mb-8 lg:mb-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-3 px-1">
                Browse by Category
              </p>
              <CategoryBtn
                active={activeCategory === "all"}
                onClick={() => setActiveCategory("all")}
                icon={HelpCircle}
                label="All Questions"
                count={FAQ_DATA.reduce((n, c) => n + c.items.length, 0)}
                color="text-zinc-400"
                activeColor="bg-zinc-800"
              />
              {FAQ_DATA.map((cat) => (
                <CategoryBtn
                  key={cat.id}
                  active={activeCategory === cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  icon={cat.icon}
                  label={cat.label}
                  count={cat.count}
                  color={cat.color}
                  activeColor={`${cat.bgColor} border ${cat.borderColor}`}
                />
              ))}
            </div>
          </aside>

          {/* FAQ Items */}
          <div className="flex-1 min-w-0">
            {/* Search result info */}
            {searchQuery && (
              <div className="mb-5 flex items-center gap-2 rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-3">
                <Search className="h-4 w-4 text-zinc-500" />
                <span className="text-sm text-zinc-400">
                  Found <strong className="text-white">{totalResults}</strong> result{totalResults !== 1 ? "s" : ""} for{" "}
                  <strong className="text-violet-300">&quot;{searchQuery}&quot;</strong>
                </span>
                <button onClick={() => setSearchQuery("")} className="ml-auto text-zinc-600 hover:text-zinc-400 text-xs">
                  Clear
                </button>
              </div>
            )}

            {filtered.length === 0 ? (
              <EmptyState query={searchQuery} onClear={() => setSearchQuery("")} />
            ) : (
              <div className="space-y-8">
                {filtered.map((cat) => (
                  <div key={cat.id} id={`category-${cat.id}`}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${cat.bgColor} border ${cat.borderColor}`}>
                        <cat.icon className={`h-4 w-4 ${cat.color}`} />
                      </div>
                      <h2 className="text-base font-bold text-white">{cat.label}</h2>
                      <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-500">
                        {cat.items.length}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {cat.items.map((item) => (
                        <AccordionItem
                          key={item.id}
                          item={item}
                          isOpen={openItems.has(item.id)}
                          onToggle={() => toggleItem(item.id)}
                          vote={helpfulVotes[item.id]}
                          onVote={(type) => vote(item.id, type)}
                          searchQuery={searchQuery}
                          catColor={cat.color}
                          catBg={cat.bgColor}
                          catBorder={cat.borderColor}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Still need help CTA */}
            <div className="mt-14 rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950 p-8 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(124,58,237,0.1),transparent)]" />
              <div className="relative">
                <div className="flex h-14 w-14 mx-auto mb-4 items-center justify-center rounded-2xl bg-violet-600/20 border border-violet-600/30">
                  <MessageCircle className="h-6 w-6 text-violet-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Still need help?</h3>
                <p className="text-zinc-400 mb-6 max-w-md mx-auto text-sm">
                  Our support team typically responds within 2 business hours. Describe your issue and we&apos;ll help you resolve it quickly.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link
                    href="/contact"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white px-6 py-3 text-sm font-semibold transition-all hover:shadow-lg hover:shadow-violet-600/25"
                  >
                    <Mail className="h-4 w-4" />
                    Contact Support
                  </Link>
                  <a
                    href="https://discord.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-3 text-sm font-semibold transition-all border border-zinc-700"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Join Community
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Accordion Item ────────────────────────────────────────────────────────────

function AccordionItem({
  item, isOpen, onToggle, vote, onVote, searchQuery, catColor, catBg, catBorder,
}: {
  item: FaqItem;
  isOpen: boolean;
  onToggle: () => void;
  vote?: "up" | "down";
  onVote: (t: "up" | "down") => void;
  searchQuery: string;
  catColor: string;
  catBg: string;
  catBorder: string;
}) {
  const contentRef = useRef<HTMLDivElement>(null);

  const highlight = (text: string) => {
    if (!searchQuery.trim()) return text;
    const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const parts = text.split(new RegExp(`(${escaped})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === searchQuery.toLowerCase() ? (
        <mark key={i} className="bg-violet-500/30 text-violet-200 rounded px-0.5">
          {part}
        </mark>
      ) : part
    );
  };

  return (
    <div
      id={`faq-${item.id}`}
      className={`rounded-xl border transition-all duration-200 overflow-hidden ${
        isOpen
          ? "border-zinc-600 bg-zinc-900 shadow-lg shadow-black/30"
          : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/70"
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 p-5 text-left"
        aria-expanded={isOpen}
      >
        <div className="flex items-start gap-3 min-w-0">
          {item.popular && (
            <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400 shrink-0 mt-0.5" />
          )}
          <span className={`text-sm font-semibold leading-snug transition-colors ${isOpen ? "text-white" : "text-zinc-200"}`}>
            {highlight(item.question)}
          </span>
        </div>
        <div
          className={`shrink-0 flex h-6 w-6 items-center justify-center rounded-full transition-all duration-300 ${
            isOpen ? `${catBg} border ${catBorder}` : "bg-zinc-800"
          }`}
        >
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform duration-300 ${catColor} ${isOpen ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {/* Animated content */}
      <div
        ref={contentRef}
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          maxHeight: isOpen ? (contentRef.current?.scrollHeight ?? 1000) + "px" : "0px",
          opacity: isOpen ? 1 : 0,
        }}
      >
        <div className="px-5 pb-5">
          <div className="h-px bg-zinc-800 mb-4" />
          <p className="text-sm text-zinc-400 leading-relaxed">
            {highlight(item.answer)}
          </p>

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4">
              {item.tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => { /* filter by tag */ }}
                  className="rounded-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-2.5 py-0.5 text-[10px] text-zinc-500 hover:text-zinc-300 transition"
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}

          {/* Helpful vote */}
          <div className="flex items-center gap-3 mt-5 pt-4 border-t border-zinc-800">
            <span className="text-xs text-zinc-600">Was this helpful?</span>
            <button
              onClick={() => onVote("up")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all border ${
                vote === "up"
                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                  : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-emerald-400 hover:border-emerald-500/30"
              }`}
            >
              <ThumbsUp className="h-3 w-3" />
              Yes
            </button>
            <button
              onClick={() => onVote("down")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all border ${
                vote === "down"
                  ? "bg-red-500/15 border-red-500/30 text-red-400"
                  : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-red-400 hover:border-red-500/30"
              }`}
            >
              <ThumbsDown className="h-3 w-3" />
              No
            </button>
            {vote && (
              <span className="text-xs text-zinc-600 ml-1">
                {vote === "up" ? "Thanks for your feedback! 🎉" : "We'll improve this answer."}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Category Button ───────────────────────────────────────────────────────────

function CategoryBtn({
  active, onClick, icon: Icon, label, count, color, activeColor,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  count: number;
  color: string;
  activeColor: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-left transition-all duration-150 ${
        active
          ? `${activeColor} text-white font-semibold`
          : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"
      }`}
    >
      <Icon className={`h-4 w-4 shrink-0 ${active ? color : "text-zinc-600"}`} />
      <span className="flex-1 truncate text-xs font-medium">{label}</span>
      <span className={`text-[10px] rounded-full px-1.5 py-0.5 ${active ? "bg-black/20 text-zinc-300" : "bg-zinc-800 text-zinc-600"}`}>
        {count}
      </span>
    </button>
  );
}

// ─── Empty State ───────────────────────────────────────────────────────────────

function EmptyState({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <div className="py-20 text-center">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800">
        <Search className="h-6 w-6 text-zinc-600" />
      </div>
      <h3 className="text-lg font-bold text-white mb-2">No results found</h3>
      <p className="text-zinc-500 text-sm mb-5">
        No FAQ entries match <strong className="text-zinc-300">&quot;{query}&quot;</strong>
      </p>
      <div className="flex justify-center gap-3">
        <button
          onClick={onClear}
          className="rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white px-5 py-2.5 text-sm font-medium transition"
        >
          Clear search
        </button>
        <Link
          href="/contact"
          className="rounded-xl bg-violet-600 hover:bg-violet-500 text-white px-5 py-2.5 text-sm font-medium transition"
        >
          Ask support
        </Link>
      </div>
    </div>
  );
}
