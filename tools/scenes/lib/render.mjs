// Renders generated Lottie JSON to WebP stills with the same engine the
// runtime uses (ThorVG via @lottiefiles/dotlottie-web), backed by a Node
// canvas (@napi-rs/canvas). Used by build.mjs for the scene and stamp stills.

import { createCanvas } from '@napi-rs/canvas';
import { DotLottie } from '@lottiefiles/dotlottie-web';

/**
 * Render one frame of a Lottie JSON and hand back both the canvas and a
 * dispose() to release the animation. The animation must stay alive until the
 * canvas has been read: destroying it clears the surface.
 */
function renderFrame(json, frame, width, height) {
  return new Promise((resolve, reject) => {
    const canvas = createCanvas(width, height);
    const animation = new DotLottie({ canvas, data: json, autoplay: false, loop: false });
    let settled = false;
    const dispose = () => {
      try {
        animation.destroy?.();
      } catch {
        // Already gone.
      }
    };
    const finish = (fn) => (arg) => {
      if (settled) return;
      settled = true;
      fn(arg);
    };
    animation.addEventListener(
      'load',
      finish(() => {
        animation.setFrame(frame);
        resolve({ canvas, dispose });
      }),
    );
    animation.addEventListener(
      'loadError',
      finish((event) => {
        dispose();
        reject(new Error(`render failed: ${event?.error?.message ?? 'unknown'}`));
      }),
    );
    setTimeout(
      finish(() => {
        dispose();
        reject(new Error('render timed out'));
      }),
      20000,
    );
  });
}

/** Render a frame and return a WebP buffer. */
export async function renderWebp(json, frame, width, height) {
  const { canvas, dispose } = await renderFrame(json, frame, width, height);
  try {
    return canvas.toBuffer('image/webp', 90);
  } finally {
    dispose();
  }
}

/**
 * Render a frame at `scale`, then crop the source rect (in canvas units) into
 * an output canvas of `outW` x `outH`.
 */
export async function renderCropWebp(json, frame, scale, rect, outW, outH) {
  const { canvas: full, dispose } = await renderFrame(
    json,
    frame,
    Math.round(800 * scale),
    Math.round(500 * scale),
  );
  try {
    const out = createCanvas(outW, outH);
    out.getContext('2d').drawImage(
      full,
      Math.round(rect.x * scale),
      Math.round(rect.y * scale),
      Math.round(rect.w * scale),
      Math.round(rect.h * scale),
      0,
      0,
      outW,
      outH,
    );
    return out.toBuffer('image/webp', 90);
  } finally {
    dispose();
  }
}