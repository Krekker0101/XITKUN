import React, { ReactElement, useEffect, useMemo, useRef } from "react";
import packageJson from "../../package.json";
import {
  Bug,
  Cpu,
  Database,
  Github,
  Globe,
  Heart,
  Instagram,
  Linkedin,
  Mail,
  MicOff,
  Shield,
  Sparkles,
  Star,
  Zap,
} from "lucide-react";
import { BRAND, getBrandContactHref, hasConfiguredLink } from "../config/brand";
import { useResolvedTheme } from "../hooks/useResolvedTheme";
import { getPlatformShortcut } from "../utils/platformUtils";

interface LinkCard {
  icon: ReactElement;
  title: string;
  description: string;
  href: string;
  actionLabel: string;
}

interface CreatorLink {
  href: string;
  title: string;
  icon: ReactElement;
}

export const AboutSection: React.FC = () => {
  const isLight = useResolvedTheme() === "light";
  const donationClickTimeRef = useRef<number | null>(null);
  const screenshotShortcut = getPlatformShortcut(["Cmd", "Shift", "Enter"]).join("+");

  useEffect(() => {
    if (!hasConfiguredLink(BRAND.supportUrl)) {
      return;
    }

    const handleFocus = async () => {
      if (!donationClickTimeRef.current) {
        return;
      }

      const elapsed = Date.now() - donationClickTimeRef.current;
      if (elapsed > 20000) {
        await window.electronAPI?.setDonationComplete();
      }
      donationClickTimeRef.current = null;
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  const handleOpenLink = (e: React.MouseEvent<HTMLAnchorElement>, url: string) => {
    e.preventDefault();

    if (hasConfiguredLink(BRAND.supportUrl) && url === BRAND.supportUrl) {
      donationClickTimeRef.current = Date.now();
    }

    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(url);
    } else {
      window.open(url, "_blank");
    }
  };

  const creatorLinks = useMemo<CreatorLink[]>(() => {
    const links: CreatorLink[] = [];

    if (hasConfiguredLink(BRAND.websiteUrl)) {
      links.push({
        href: BRAND.websiteUrl,
        title: "Portfolio",
        icon: <Globe size={18} />,
      });
    } else if (hasConfiguredLink(BRAND.repositoryUrl)) {
      links.push({
        href: BRAND.repositoryUrl,
        title: "GitHub",
        icon: <Github size={18} />,
      });
    }

    if (hasConfiguredLink(BRAND.linkedinUrl)) {
      links.push({
        href: BRAND.linkedinUrl,
        title: "LinkedIn",
        icon: <Linkedin size={18} />,
      });
    }

    if (hasConfiguredLink(BRAND.xUrl)) {
      links.push({
        href: BRAND.xUrl,
        title: "X",
        icon: <Star size={18} />,
      });
    }

    if (hasConfiguredLink(BRAND.instagramUrl)) {
      links.push({
        href: BRAND.instagramUrl,
        title: "Instagram",
        icon: <Instagram size={18} />,
      });
    }

    return links;
  }, []);

  const projectCards = useMemo<LinkCard[]>(() => {
    const cards: LinkCard[] = [];
    const contactHref = getBrandContactHref();

    if (hasConfiguredLink(BRAND.websiteUrl)) {
      cards.push({
        href: BRAND.websiteUrl,
        icon: <Globe size={18} />,
        title: "Portfolio",
        description: "Personal portfolio, project presentation, and primary contact point.",
        actionLabel: "Visit portfolio",
      });
    } else if (hasConfiguredLink(BRAND.repositoryUrl)) {
      cards.push({
        href: BRAND.repositoryUrl,
        icon: <Github size={18} />,
        title: "Project Repository",
        description: "Browse the codebase, release history, and packaging metadata.",
        actionLabel: "Open repository",
      });
    }

    if (!hasConfiguredLink(BRAND.websiteUrl) && hasConfiguredLink(BRAND.issuesUrl)) {
      cards.push({
        href: BRAND.issuesUrl,
        icon: <Bug size={18} />,
        title: "Issue Tracking",
        description: "Capture bugs, polish requests, and release follow-ups in one place.",
        actionLabel: "View issues",
      });
    }

    if (
      hasConfiguredLink(BRAND.websiteUrl) &&
      (!hasConfiguredLink(BRAND.repositoryUrl) || BRAND.websiteUrl !== BRAND.repositoryUrl)
    ) {
      cards.push({
        href: BRAND.websiteUrl,
        icon: <Globe size={18} />,
        title: "Website",
        description: "Public landing page for product updates and distribution.",
        actionLabel: "Visit site",
      });
    }

    if (hasConfiguredLink(BRAND.supportUrl)) {
      cards.push({
        href: BRAND.supportUrl,
        icon: <Heart size={18} />,
        title: "Support Development",
        description: "Optional support channel for sustaining independent work.",
        actionLabel: "Support project",
      });
    }

    if (hasConfiguredLink(contactHref)) {
      cards.push({
        href: contactHref,
        icon: <Mail size={18} />,
        title: "Contact",
        description: "Direct channel for collaboration, consulting, and product inquiries.",
        actionLabel: "Send email",
      });
    }

    return cards;
  }, []);

  return (
    <div className="space-y-6 animated fadeIn pb-10">
      <div>
        <h3 className="text-lg font-bold text-text-primary mb-1">About {BRAND.appName}</h3>
        <p className="text-sm text-text-secondary">{BRAND.tagline}</p>
      </div>

      <div>
        <h4 className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-2 px-1">
          Current Release
        </h4>
        <div className="bg-bg-item-surface rounded-xl border border-border-subtle overflow-hidden">
          <div className="p-3 border-b border-border-subtle bg-bg-card/50">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center text-yellow-400 shrink-0">
                <Zap size={20} />
              </div>
              <div>
                <h5 className="text-sm font-bold text-text-primary mb-1">
                  Release v{packageJson.version}
                </h5>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Core branding, packaging metadata, and user-facing identity are now aligned
                  under {BRAND.ownerName}.
                </p>
              </div>
            </div>
          </div>

          <div className="p-3 border-b border-border-subtle bg-bg-card/50">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
                <Sparkles size={20} />
              </div>
              <div>
                <h5 className="text-sm font-bold text-text-primary mb-1">
                  Capture and Analyze
                </h5>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Press {screenshotShortcut} to capture context and route it through your
                  configured model stack with minimal interruption.
                </p>
              </div>
            </div>
          </div>

          <div className="p-3 bg-bg-card/50">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400 shrink-0">
                <Globe size={20} />
              </div>
              <div>
                <h5 className="text-sm font-bold text-text-primary mb-1">
                  Configurable Identity Layer
                </h5>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Branding, release endpoints, and owner-facing links are now organized for
                  safer future customization.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-2 px-1">
          Architecture
        </h4>
        <div className="bg-bg-item-surface rounded-xl border border-border-subtle overflow-hidden">
          <div className="p-3 border-b border-border-subtle bg-bg-card/50">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0">
                <Cpu size={20} />
              </div>
              <div>
                <h5 className="text-sm font-bold text-text-primary mb-1">Hybrid Intelligence</h5>
                <p className="text-xs text-text-secondary leading-relaxed">
                  The app combines fast-response assistants, reasoning models, and live speech
                  services to support both quick prompts and deeper analysis.
                </p>
              </div>
            </div>
          </div>

          <div className="p-3 bg-bg-card/50">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 shrink-0">
                <Database size={20} />
              </div>
              <div>
                <h5 className="text-sm font-bold text-text-primary mb-1">Local Memory</h5>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Context retrieval stays on-device through a local vector pipeline, helping the
                  assistant remember previous meetings without depending on a remote memory layer.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-2 px-1">
          Privacy
        </h4>
        <div className="bg-bg-item-surface rounded-xl border border-border-subtle p-5 space-y-4">
          <div className="flex items-start gap-3">
            <Shield size={16} className="text-green-400 mt-0.5" />
            <div>
              <h5 className="text-sm font-medium text-text-primary">Local-first control</h5>
              <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                The workflow is designed around explicit capture, local storage, and deliberate
                model usage rather than background collection.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <MicOff size={16} className="text-red-500 mt-0.5" />
            <div>
              <h5 className="text-sm font-medium text-text-primary">No silent surveillance</h5>
              <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                Screenshots, overlays, and speech features are only useful when you trigger them.
                The product is positioned as a tool you control, not one that quietly watches.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-2 px-1">
          Creator
        </h4>
        <div className="bg-bg-item-surface rounded-xl p-5 border border-border-subtle">
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-bg-elevated border border-border-subtle flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-text-primary">AA</span>
              </div>

              <div className="pt-0.5">
                <div className="flex items-center gap-2 mb-1">
                  <h5 className="text-sm font-bold text-text-primary">{BRAND.ownerName}</h5>
                  <span
                    className={`text-[10px] font-medium px-1.5 py-[1px] rounded-full ${
                      isLight
                        ? "bg-amber-100 text-amber-700 border border-amber-300"
                        : "bg-yellow-400/10 text-yellow-200 border border-yellow-400/5"
                    }`}
                  >
                    Creator
                  </span>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed max-w-lg">
                  {BRAND.appName} is now presented as an independent product by{" "}
                  {BRAND.ownerName}, with a cleaner identity and more maintainable configuration.
                </p>
              </div>
            </div>

            {creatorLinks.length > 0 && (
              <div className="flex items-center gap-4 pl-[60px]">
                {creatorLinks.map((link) => (
                  <a
                    key={link.title}
                    href={link.href}
                    onClick={(e) => handleOpenLink(e, link.href)}
                    className="text-text-tertiary hover:text-text-primary transition-colors"
                    title={link.title}
                  >
                    {link.icon}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {projectCards.length > 0 && (
        <div>
          <h4 className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-2 px-1">
            Project Links
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projectCards.map((card) => (
              <a
                key={card.title}
                href={card.href}
                onClick={(e) => handleOpenLink(e, card.href)}
                className="bg-bg-item-surface border border-border-subtle rounded-xl p-5 transition-all group flex items-center gap-4 h-full hover:bg-white/10"
              >
                <div className="w-10 h-10 rounded-lg bg-bg-card/80 flex items-center justify-center text-text-primary shrink-0 group-hover:scale-105 transition-transform">
                  {card.icon}
                </div>
                <div>
                  <h5 className="text-sm font-bold text-text-primary">{card.title}</h5>
                  <p className="text-xs text-text-secondary mt-0.5">{card.description}</p>
                  <p className="text-[11px] font-medium text-text-primary mt-2">{card.actionLabel}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="pt-4 border-t border-border-subtle">
        <div>
          <h4 className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-3">
            Core Technology
          </h4>
          <div className="flex flex-wrap gap-2">
            {[
              "OpenAI",
              "Gemini",
              "Groq",
              "Deepgram",
              "ElevenLabs",
              "Electron",
              "React",
              "Rust",
              "TypeScript",
              "Tailwind CSS",
              "Vite",
              "SQLite",
            ].map((tech) => (
              <span
                key={tech}
                className="px-2.5 py-1 rounded-md bg-bg-input border border-border-subtle text-[11px] font-medium text-text-secondary"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
