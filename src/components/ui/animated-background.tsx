'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export function AnimatedBackground() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="fixed inset-0 bg-slate-100 dark:bg-slate-950 -z-10" />;

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
        {/* Base Layer */}
      <div className="absolute inset-0 bg-slate-50 dark:bg-slate-950" />

      {/* Animated Gradient Blobs */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 90, 0],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] bg-purple-300/30 dark:bg-purple-900/20 rounded-full blur-3xl"
      />

      <motion.div
        animate={{
          scale: [1, 1.3, 1],
          x: [0, 100, 0],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute top-[40%] -right-[10%] w-[60vw] h-[60vw] bg-blue-300/30 dark:bg-blue-900/20 rounded-full blur-3xl"
      />

       <motion.div
        animate={{
          scale: [1, 1.5, 1],
          y: [0, -50, 0],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute -bottom-[20%] left-[20%] w-[80vw] h-[80vw] bg-indigo-300/30 dark:bg-indigo-900/20 rounded-full blur-3xl"
      />
    </div>
  );
}
