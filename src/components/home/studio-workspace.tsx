import { ArrowRight, AudioLines, Clapperboard, Film, FolderOpen, ImageIcon, LayoutGrid, Repeat2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { brand } from "@/config/brand";
import { routes } from "@/content/site";

const studios = [
  { title: "Image", detail: "Generate and edit stills", href: routes.image, icon: ImageIcon },
  { title: "Video", detail: "Animate a frame or generate a shot", href: routes.video, icon: Film },
  { title: "Audio", detail: "Make music and voiceovers", href: routes.audio, icon: AudioLines },
];

const production = [
  { title: "Remix", href: routes.remix, icon: Repeat2 },
  { title: "Canvas", href: routes.canvas, icon: LayoutGrid },
  { title: "Library", href: routes.library, icon: FolderOpen },
];

export function StudioWorkspace() {
  return (
    <div className="bg-[#171410] text-[#fff7e9]">
      <div className="mx-auto grid w-full max-w-[1320px] gap-8 px-5 pt-12 pb-12 sm:px-10 sm:pt-16 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] lg:items-start lg:gap-x-14 lg:pt-20 lg:pb-16">
        <section aria-labelledby="studio-title">
          <h1 id="studio-title" className="font-display text-[clamp(3.25rem,7vw,6rem)] leading-none font-semibold tracking-[-0.04em]">
            {brand.name}
          </h1>
          <p className="mt-4 max-w-[28ch] text-lg text-[#d4c4ae] sm:text-xl">
            Make stills, motion and sound in one workspace.
          </p>
          <ul className="mt-7 divide-y divide-[#fff7e9]/15 border-y border-[#fff7e9]/15 sm:mt-9">
            {studios.map(({ title, detail, href, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="group flex min-h-[68px] items-center gap-4 py-3 pr-2 transition-colors hover:bg-[#fff7e9]/5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#ffd092]"
                >
                  <Icon size={22} strokeWidth={1.5} aria-hidden className="shrink-0 text-[#ffd092]" />
                  <span className="min-w-0 flex-1">
                    <span className="block leading-tight font-semibold">{title}</span>
                    <span className="mt-1 block text-sm text-[#d4c4ae]">{detail}</span>
                  </span>
                  <ArrowRight size={18} strokeWidth={1.5} aria-hidden className="shrink-0 text-[#ffd092] transition-transform motion-safe:group-hover:translate-x-1" />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="cinema-title" className="overflow-hidden rounded-2xl border border-[#fff7e9]/15 bg-[#241c16]">
          <div className="relative aspect-[16/9] w-full bg-[#59311e]">
            <Image
              src="/media/home/slide-cinema.jpg"
              alt="A silhouetted film crew and camera crane in front of a setting sun"
              fill
              sizes="(min-width: 1320px) 720px, (min-width: 1024px) 58vw, 100vw"
              className="object-cover"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-6">
            <div>
              <h2 id="cinema-title" className="font-display text-xl font-semibold">Cinema Studio</h2>
              <p className="mt-1 text-sm text-[#d4c4ae]">Plan a sequence and generate it shot by shot.</p>
            </div>
            <Link
              href={routes.cinema}
              className="inline-flex min-h-11 items-center gap-2 rounded-md bg-[#ffd092] px-4 text-sm font-semibold text-[#24170d] transition-colors hover:bg-[#ffe0b5] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffd092]"
            >
              <Clapperboard size={17} strokeWidth={1.5} aria-hidden />
              Open Cinema
            </Link>
          </div>
        </section>

        <nav aria-label="Production tools" className="flex flex-wrap items-center gap-x-7 gap-y-1 border-t border-[#fff7e9]/15 pt-3 lg:col-span-2">
          {production.map(({ title, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="inline-flex min-h-11 items-center gap-2 rounded-xs text-sm font-medium text-[#d4c4ae] hover:text-[#fff7e9] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffd092]"
            >
              <Icon size={18} strokeWidth={1.5} aria-hidden />
              {title}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
