import Image from "next/image";
import VaesenMark from "./vaesen-mark";

export default function PageMasthead({ title, eyebrow = "Society Ledger", description, artwork = "manor", children }: {
  title: string; eyebrow?: string; description: string; artwork?: "manor" | "library"; children?: React.ReactNode;
}) {
  return (
    <header className="ledger-masthead">
      <Image src={artwork === "manor" ? "/art/nordic-manor.webp" : "/art/field-journal.webp"} alt="" fill sizes="(max-width: 768px) 100vw, 1280px" className="ledger-masthead-art" priority />
      <div className="ledger-masthead-copy">
        <p className="ledger-kicker flex items-center gap-2"><VaesenMark className="h-5 w-5" />{eyebrow}</p>
        <h1>{title}</h1>
        <p className="mt-3 max-w-lg leading-relaxed">{description}</p>
        {children && <div className="mt-5 flex flex-wrap gap-3">{children}</div>}
      </div>
    </header>
  );
}
