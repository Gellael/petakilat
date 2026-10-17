import { useLayoutEffect, type RefObject } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Pelengkap motion.tsx. File itu sudah menangani hero (judul, paragraf, tombol,
 * kemiringan dan perakitan peta), judul bagian, dan paket kredit.
 * Hook ini hanya menambah yang belum ada, dan hanya memakai transform + opacity:
 *  1. Kartu fitur, langkah, harga, dan fakta "Tentang" muncul sekali saat discroll
 *     (ScrollTrigger.batch: satu trigger untuk banyak elemen).
 *  2. Nomor langkah "Cara kerja" muncul membal.
 *  3. Garis progres scroll tipis di bawah navigasi.
 * Dilewati sepenuhnya jika pengguna memilih "kurangi gerakan".
 */

// Elemen yang dianimasikan hook ini (aman saat efek dijalankan ulang, mis. React StrictMode)
const mine = new WeakSet<Element>();
// Jika elemen sudah dianimasikan GSAP oleh kode lain, jangan disentuh
const hasOtherGsap = (el: Element) => !!(el as unknown as { _gsap?: unknown })._gsap && !mine.has(el);

export function useHomeFx(rootRef: RefObject<HTMLElement | null>, enabled: boolean) {
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!enabled || !root) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    let cancelled = false;
    const cleanups: Array<() => void> = [];
    const pick = (sel: string) =>
      Array.from(root.querySelectorAll<HTMLElement>(sel)).filter((el) => !hasOtherGsap(el));

    const ctx = gsap.context(() => {
      // ---------- 1. Muncul saat discroll (sekali saja) ----------
      const reveal = (sel: string, o: { x?: number; y?: number } = {}) => {
        const els = pick(sel);
        if (!els.length) return;
        els.forEach((el) => {
          mine.add(el);
          el.style.transition = 'none'; // transisi CSS pada transform (mis. .gl-plan) membuat animasi tersendat
        });
        cleanups.push(() => els.forEach((el) => { el.style.transition = ''; }));
        gsap.set(els, { opacity: 0, x: o.x ?? 0, y: o.y ?? 24 });
        ScrollTrigger.batch(els, {
          scroller: root,
          start: 'top 90%',
          once: true,
          interval: 0.08,
          batchMax: 6,
          onEnter: (batch) =>
            gsap.to(batch, {
              opacity: 1, x: 0, y: 0, duration: 0.75, ease: 'power3.out', stagger: 0.09, overwrite: true,
              onComplete: () => {
                batch.forEach((el) => {
                  gsap.set(el, { clearProps: 'opacity,transform' });
                  (el as HTMLElement).style.transition = '';
                });
              },
            }),
        });
      };
      reveal('.gl-facts > div', { x: -14, y: 0 });
      reveal('.gl-tile');
      reveal('.gl-flow li', { y: 20 });
      reveal('.gl-plan');

      // ---------- 2. Nomor langkah ----------
      const badges = pick('.gl-step__n');
      const flow = root.querySelector<HTMLElement>('.gl-flow');
      if (badges.length && flow) {
        badges.forEach((el) => mine.add(el));
        gsap.from(badges, {
          scale: 0.4, opacity: 0, duration: 0.5, ease: 'back.out(2)', stagger: 0.14, clearProps: 'transform,opacity',
          scrollTrigger: { trigger: flow, scroller: root, start: 'top 80%', once: true },
        });
      }

      // ---------- 3. Garis progres scroll ----------
      const bar = root.querySelector<HTMLElement>('[data-fx="progress"]');
      if (bar) {
        gsap.fromTo(
          bar,
          { scaleX: 0 },
          { scaleX: 1, ease: 'none', scrollTrigger: { scroller: root, start: 0, end: 'max', scrub: 0.25 } }
        );
      }
    }, root);

    // Font web yang baru dimuat mengubah tinggi halaman: hitung ulang posisi trigger
    (document.fonts?.ready ?? Promise.resolve()).then(() => {
      if (!cancelled) ScrollTrigger.refresh();
    });

    return () => {
      cancelled = true;
      cleanups.forEach((fn) => fn());
      ctx.revert();
    };
  }, [enabled, rootRef]);
}