import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { cn } from '@/utils/cn.js';

type FloatingPathsBackgroundProps = {
  position: number;
  className?: string;
  children?: ReactNode;
};

// Adapted from the 21st.dev Floating Paths component supplied for formER.
export function FloatingPathsBackground({ position, children, className }: FloatingPathsBackgroundProps) {
  const animate = useReducedMotion() === false;
  const paths = Array.from({ length: 36 }, (_, index) => {
    const x = index * 5 * position;
    const y = index * 6;
    return {
      d: `M${x - 380} ${-189 - y}C${x - 380} ${-189 - y} ${x - 312} ${216 - y} ${152 - x} ${343 - y}C${616 - x} ${470 - y} ${684 - x} ${875 - y} ${684 - x} ${875 - y}`,
      width: 0.5 + index * 0.03,
      opacity: 0.22 + index * 0.012,
      duration: 20 + (index * 7 % 10),
    };
  });

  return (
    <div className={cn('relative isolate w-full', className)}>
      <div className="floating-paths-art" aria-hidden="true">
        <svg className="h-full w-full" viewBox="0 45 696 316" fill="none" focusable="false" preserveAspectRatio="none">
          {paths.map(({ d, width, opacity, duration }) => (
            <motion.path
              key={d}
              d={d}
              stroke="currentColor"
              strokeWidth={width}
              strokeOpacity={opacity}
              vectorEffect="non-scaling-stroke"
              initial={false}
              animate={animate ? { opacity: [0.72, 1, 0.72] } : undefined}
              transition={animate ? { duration, repeat: Infinity, ease: 'linear' } : undefined}
            />
          ))}
        </svg>
      </div>
      {children}
    </div>
  );
}
