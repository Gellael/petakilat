/**
 * motion.tsx: animasi GSAP Petakilat, khusus halaman beranda.
 * Dashboard peta sengaja tanpa GSAP (memakai skeleton loading) supaya ringan.
 *
 * Instalasi (sekali saja):  npm i gsap
 * Sejak GSAP 3.13 semua plugin (ScrollTrigger, SplitText, Draggable, InertiaPlugin) gratis dan ikut paket "gsap".
 *
 * Properti sementara (clip-path, transform) dibersihkan setelah animasi selesai,
 * dan "reduce motion" dihormati.
 */
import { useLayoutEffect, type RefObject } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { Draggable } from 'gsap/Draggable';
import { InertiaPlugin } from 'gsap/InertiaPlugin';

gsap.registerPlugin(ScrollTrigger, SplitText, Draggable, InertiaPlugin);

const reduced = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const CLEAR = 'clipPath,webkitClipPath,transform,opacity,visibility';

/* ------------------------------------------------------------------ */
/* 1. Beranda: judul hero per baris + reveal saat scroll              */
/* ------------------------------------------------------------------ */
export function useHomeMotion(rootRef: RefObject<HTMLElement | null>, active: boolean) {
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!active || !root || reduced()) return;

    const splits: SplitText[] = [];
    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(root);

      // hero: judul dipecah per baris, tiap baris naik dari balik topeng
      const h1 = q('.gl-hero h1')[0] as HTMLElement | undefined;
      const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
      if (h1) {
        const s = SplitText.create(h1, { type: 'lines', mask: 'lines', autoSplit: true });
        splits.push(s);
        tl.from(s.lines, { yPercent: 110, duration: 1.2, stagger: 0.1 }, 0.1);
      }
      tl.from(q('.gl-hero__tag'), { clipPath: 'inset(0 100% 0 0)', duration: 0.9, ease: 'expo.inOut', clearProps: CLEAR }, 0);
      tl.from(q('.gl-hero p'), { clipPath: 'inset(0 0 100% 0)', duration: 1, ease: 'expo.inOut', clearProps: CLEAR }, 0.45);
      tl.from(q('.gl-cta .gl-btn'), { clipPath: 'inset(0 100% 0 0)', duration: 0.8, stagger: 0.08, ease: 'expo.inOut', clearProps: CLEAR }, 0.65);
      tl.from(q('.gl-hero__facts li'), { clipPath: 'inset(0 100% 0 0)', duration: 0.7, stagger: 0.07, ease: 'expo.inOut', clearProps: CLEAR }, 0.85);

      // judul bagian: masuk satu kali saat terlihat
      q('.gl-sect h2').forEach((h) => {
        const s = SplitText.create(h as HTMLElement, { type: 'lines', mask: 'lines', autoSplit: true });
        splits.push(s);
        gsap.from(s.lines, {
          yPercent: 110, duration: 1, ease: 'expo.out', stagger: 0.08,
          scrollTrigger: { trigger: h, scroller: root, start: 'top 88%', once: true },
        });
      });

      // pilihan paket kredit: menyapu masuk berurutan, ini momen penting di halaman harga
      const packs = q('.gl-pack');
      if (packs.length) {
        gsap.from(packs, {
          clipPath: 'inset(0 100% 0 0 round 14px)', duration: 0.9, ease: 'expo.inOut', stagger: 0.1, clearProps: CLEAR,
          scrollTrigger: { trigger: packs[0], scroller: root, start: 'top 85%', once: true },
        });
      }
    }, root);

    return () => { ctx.revert(); splits.forEach((s) => s.revert()); };
  }, [active, rootRef]);
}

/* ------------------------------------------------------------------ */
/* 2. Peta contoh di hero: terangkai, bisa digeser, foto bisa ditarik  */
/* ------------------------------------------------------------------ */
export function useHeroMap(rootRef: RefObject<HTMLElement | null>, active: boolean) {
  useLayoutEffect(() => {
    const root = rootRef.current;
    const hero = root?.querySelector<HTMLElement>('.gl-hero');
    const sheet = root?.querySelector<HTMLElement>('.gl-sheet');
    if (!active || !root || !hero || !sheet) return;

    const calm = reduced();
    const coarse = window.matchMedia('(hover:none)').matches;
    const drags: Draggable[] = [];
    let dragging = false;
    const cleanups: Array<() => void> = [];

    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(sheet);
      const one = <T extends Element = SVGElement>(sel: string): T | undefined =>
        sheet.querySelector<T>(sel) ?? undefined;
      const pan = one('.hm-pan');
      const far = one('.hm-far');
      const clip = one('.hm-clip');
      const card = one('.hm-card');
      const label = one('.hm-label');
      const line = one('.hm-line');
      const ring = one('.hm-ring');
      const river = one<SVGGeometryElement>('.hm-river');
      if (!pan || !far || !clip) return;

      /* ---- tilt halus mengikuti kursor ---- */
      let rx: (v: number) => void = () => {};
      let ry: (v: number) => void = () => {};
      if (!calm && !coarse) {
        gsap.set(sheet, { transformPerspective: 1100 });
        rx = gsap.quickTo(sheet, 'rotationX', { duration: 0.9, ease: 'power3' });
        ry = gsap.quickTo(sheet, 'rotationY', { duration: 0.9, ease: 'power3' });
        const move = (e: PointerEvent) => {
          if (dragging) return;
          const r = hero.getBoundingClientRect();
          ry(((e.clientX - r.left) / r.width - 0.5) * 7);
          rx(-((e.clientY - r.top) / r.height - 0.5) * 5);
        };
        const leave = () => { rx(0); ry(0); };
        hero.addEventListener('pointermove', move);
        hero.addEventListener('pointerleave', leave);
        cleanups.push(() => {
          hero.removeEventListener('pointermove', move);
          hero.removeEventListener('pointerleave', leave);
        });
      }

      /* ---- interaksi: geser peta, tarik foto dan label ---- */
      const hideHint = () => gsap.to(q('.hm-hint'), { opacity: 0, duration: 0.5, overwrite: true });
      const press = () => { dragging = true; rx(0); ry(0); hideHint(); };
      const release = () => { dragging = false; };
      const parallax = (d: Draggable) => gsap.set(far, { x: -d.x * 0.5, y: -d.y * 0.5 });

      const setupDrag = () => {
        const panDrag = Draggable.create(pan, {
          type: 'x,y',
          trigger: clip,
          bounds: { minX: -80, maxX: 80, minY: -70, maxY: 70 },
          inertia: !calm,
          edgeResistance: 0.85,
          cursor: 'grab',
          activeCursor: 'grabbing',
          onPress: press,
          onRelease: release,
          onDrag: function (this: Draggable) { parallax(this); },
          onThrowUpdate: function (this: Draggable) { parallax(this); },
        })[0];
        drags.push(panDrag);

        // klik dua kali: peta kembali ke posisi awal
        const reset = () => {
          gsap.to(pan, {
            x: 0, y: 0, duration: 1, ease: 'expo.out',
            onUpdate: () => { panDrag.update(); parallax(panDrag); },
          });
        };
        clip.addEventListener('dblclick', reset);
        cleanups.push(() => clip.removeEventListener('dblclick', reset));

        // foto lokasi: garis penunjuk ikut bergerak
        if (card) {
          drags.push(Draggable.create(card, {
            type: 'x,y', cursor: 'grab', activeCursor: 'grabbing',
            onPress: function (this: Draggable, e: Event) { e.stopPropagation(); press(); },
            onRelease: release,
            onDrag: function (this: Draggable) {
              if (line) gsap.set(line, { attr: { x1: 64 + this.x, y1: 96 + this.y } });
            },
          })[0]);
        }
        // label nama desa
        if (label) {
          drags.push(Draggable.create(label, {
            type: 'x,y', cursor: 'grab', activeCursor: 'grabbing',
            onPress: function (this: Draggable, e: Event) { e.stopPropagation(); press(); },
            onRelease: release,
          })[0]);
        }
      };

      if (calm) { setupDrag(); return; }

      /* ---- perakitan peta saat dibuka ---- */
      const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
      tl.from(sheet, { clipPath: 'inset(0 0 0 100%)', duration: 1.3, ease: 'expo.inOut', clearProps: 'clipPath,webkitClipPath' }, 0.2);
      tl.from(q('.hm-panel'), { opacity: 0, x: 18, duration: 0.9, stagger: 0.09 }, 0.7);
      tl.from(q('.hm-far ellipse'), { scale: 0, transformOrigin: '50% 50%', duration: 1.4, stagger: 0.15, ease: 'power3.out' }, 0.5);
      tl.from(q('.hm-neigh polygon'), { opacity: 0, duration: 0.8, stagger: 0.12, ease: 'power2.out' }, 1);
      if (river) {
        const len = river.getTotalLength();
        tl.fromTo(river, { strokeDasharray: len, strokeDashoffset: len },
          { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut', clearProps: 'strokeDasharray,strokeDashoffset' }, 0.9);
      }
      tl.from(q('.gl-draw'), { strokeDashoffset: 1, duration: 1.8, ease: 'power2.inOut' }, 1);
      tl.from(q('.gl-fillin'), { opacity: 0, duration: 0.9, ease: 'power2.out' }, 2.2);
      tl.from(q('.hm-label'), { opacity: 0, scale: 0.6, transformOrigin: '50% 50%', duration: 0.9, ease: 'back.out(2)' }, 2.5);
      tl.from(q('.hm-pin'), { scale: 0, transformOrigin: '50% 50%', duration: 1.1, ease: 'elastic.out(1, 0.5)' }, 2.3);
      if (line) tl.from(line, { attr: { x2: 64, y2: 96 }, duration: 0.9, ease: 'power3.out' }, 2.4);
      tl.from(q('.hm-card'), { opacity: 0, y: -26, rotation: -5, transformOrigin: '50% 0%', duration: 1, ease: 'back.out(1.6)' }, 2.4);
      tl.from(q('.hm-hint'), { opacity: 0, duration: 0.6 }, 3.2);
      if (ring) {
        tl.fromTo(ring, { scale: 1, opacity: 0.7, transformOrigin: '50% 50%' },
          { scale: 3.2, opacity: 0, duration: 1.8, ease: 'power2.out', repeat: -1, repeatDelay: 0.6 }, 3);
      }
      // gerakan pengguna baru aktif setelah perakitan selesai, supaya tidak berebut transform
      tl.add(() => { ctx.add(setupDrag); }, 3.4);
    }, sheet);

    return () => {
      cleanups.forEach((fn) => fn());
      drags.forEach((d) => d.kill());
      ctx.revert();
      gsap.set(sheet, { clearProps: 'transform' });
    };
  }, [active, rootRef]);
}