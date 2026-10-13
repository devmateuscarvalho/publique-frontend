export type SocialNetworkID = "linkedin" | "instagram" | "facebook";

export function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45z" />
    </svg>
  );
}

export function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M14 9h3V6h-3c-2.2 0-4 1.8-4 4v2H8v3h2v7h3v-7h2.6l.4-3H13v-2c0-.6.4-1 1-1z" />
    </svg>
  );
}

export function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M14.2 3c.5 2.5 2.1 4.3 4.8 4.6v3c-1.6.1-3.1-.4-4.4-1.3v6.6c0 3.5-2.7 6.3-6.4 6.3S2 19.4 2 15.9s2.7-6.3 6.4-6.3c.5 0 .9.1 1.4.2v3.2c-.4-.2-.9-.3-1.4-.3-1.8 0-3.2 1.5-3.2 3.2 0 1.8 1.4 3.2 3.2 3.2s3.2-1.4 3.2-3.2V3h2.6Z" />
    </svg>
  );
}

export function SocialNetworkIcon({ id, className }: { id: SocialNetworkID; className?: string }) {
  if (id === "linkedin") {
    return <LinkedInIcon className={className} />;
  }
  if (id === "facebook") {
    return <FacebookIcon className={className} />;
  }
  return <InstagramIcon className={className} />;
}

export function socialConnectClass(id: SocialNetworkID) {
  if (id === "linkedin") {
    return "bg-[#0A66C2] hover:bg-[#004182]";
  }
  if (id === "facebook") {
    return "bg-[#1877F2] hover:bg-[#0d65d9]";
  }
  return "bg-[#111111] hover:bg-black";
}

export function socialMarkClass(id: SocialNetworkID) {
  if (id === "linkedin") {
    return "bg-[#0A66C2]";
  }
  if (id === "facebook") {
    return "bg-[#1877F2]";
  }
  return "bg-[linear-gradient(135deg,#f58529_0%,#dd2a7b_50%,#8134af_100%)]";
}
