import DynamicLogo from "@/components/dynamic/Logo";

const LINKS = [
  {
    label: "GitHub",
    href: "https://github.com/dynamic-labs/examples/tree/main/examples/nextjs-defi-lending-moonwell",
  },
  { label: "Docs", href: "https://docs.dynamic.xyz" },
  { label: "Dashboard", href: "https://app.dynamic.xyz" },
  { label: "Support", href: "https://www.dynamic.xyz/join-slack" },
];

export default function Footer() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-white/85 backdrop-blur-md border-t border-mw-grey-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-mw-grey-400">
          <div className="flex items-center gap-2">
            <span>powered by</span>
            <DynamicLogo width={70} height={14} />
          </div>
          <ul className="flex gap-4">
            {LINKS.map(({ label, href }) => (
              <li key={label}>
                <a
                  href={href}
                  className="hover:text-mw-black transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
