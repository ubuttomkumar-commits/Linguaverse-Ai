export function GlobeStaticFallback({ ariaLabel }: { ariaLabel: string }) {
  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className="relative grid h-full w-full place-items-center"
    >
      <span
        aria-hidden="true"
        className="lv-orbit-ring pointer-events-none absolute h-[210px] w-[210px] rounded-full border border-[#38bdf8]/40 sm:h-[260px] sm:w-[260px]"
      />
      <span
        aria-hidden="true"
        className="lv-orbit-ring-rev pointer-events-none absolute h-[170px] w-[170px] rounded-full border border-[#8b6dff]/45 sm:h-[214px] sm:w-[214px]"
      />
      <span
        aria-hidden="true"
        className="lv-orbit-ring-outer pointer-events-none absolute h-[246px] w-[246px] rounded-full border border-dashed border-[#d946ef]/30 sm:h-[304px] sm:w-[304px]"
      />
      <div className="lv-float-slow relative grid h-[140px] w-[140px] place-items-center rounded-full bg-[radial-gradient(circle_at_32%_26%,#e0f4ff_0%,#4f8bff_24%,#4338ca_56%,#0b132b_88%)] shadow-[0_0_54px_rgba(56,189,248,0.34),0_0_96px_rgba(139,109,255,0.24),inset_-16px_-18px_36px_#060b18] sm:h-[176px] sm:w-[176px]">
        <span className="pointer-events-none absolute inset-[12px] rounded-full border border-[#e0f2fe]/40 [transform:rotateX(65deg)_rotateZ(24deg)]" />
        <span className="pointer-events-none absolute -inset-[8px] rounded-full border border-[#38bdf8]/30 [transform:rotateX(70deg)_rotateZ(-30deg)]" />
        <div className="relative z-10 text-center">
          <span className="font-display block text-[14px] font-extrabold tracking-[0.16em] text-white sm:text-[16px]">
            LINGUA
          </span>
          <span className="mt-0.5 block text-[8px] font-semibold tracking-[0.2em] text-[#bae6fd]">
            3D CORE
          </span>
        </div>
      </div>
    </div>
  );
}
