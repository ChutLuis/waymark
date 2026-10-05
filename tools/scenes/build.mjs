// Builds the Waymark destination scenes and confirm stamps as Lottie JSON,
// validating every file against the scene spec before writing it. Also emits
// the WebP stills the UI uses for back postcards, decorative stamps and
// placeholders (frame 0 of each scene; frame 18 of each stop stamp).
//
//   node tools/scenes/build.mjs            # everything
//   node tools/scenes/build.mjs 01 stamps  # scenes whose id starts with 01, plus stamps
//   node tools/scenes/build.mjs --no-stills
//
// Still export needs @napi-rs/canvas + @lottiefiles/dotlottie-web (ThorVG),
// so it is skipped with a warning if those aren't installed.

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { scenes } from './scenes/index.mjs';
import { stamps } from './stamps/index.mjs';
import { validate } from './lib/validate.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const argv = process.argv.slice(2);
const wantsStills = !argv.includes('--no-stills');
const args = argv.filter((a) => !a.startsWith('--'));
const wants = (id) => !args.length || args.some((a) => id.startsWith(a));

let failed = 0;

function emit(dir, id, json, opts) {
  const report = validate(json, opts);
  const file = path.join(root, dir, `${id}.json`);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(json));
  const s = report.stats;
  const flag = report.errors.length ? 'FAIL' : 'ok  ';
  console.log(
    `${flag} ${id.padEnd(26)} ${String(s.bytes).padStart(7)} B  ${String(s.layers).padStart(2)} layers  ${String(s.vertices).padStart(6)} verts  ${String(s.stroked).padStart(5)} stroked  ${String(s.draws).padStart(4)} draws  ${String(s.gradients).padStart(3)} grad  ${String(s.animated).padStart(4)} anim`,
  );
  for (const e of report.errors) console.log(`     error: ${e}`);
  for (const w of report.warnings) console.log(`     warn:  ${w}`);
  if (report.errors.length) failed++;
  return report.errors.length === 0;
}

const SCENE_CROP = { x: 200, y: 0, w: 400, h: 500 };

let render;
if (wantsStills) {
  try {
    render = await import('./lib/render.mjs');
  } catch (error) {
    console.warn(`stills skipped: ${error.message}`);
    render = null;
  }
}

async function emitStills(id, json, kind) {
  if (!render) return;
  try {
    if (kind === 'scene') {
      const dir = path.join(root, 'assets/lottie/stills/scenes');
      mkdirSync(dir, { recursive: true });
      writeFileSync(path.join(dir, `${id}.webp`), await render.renderWebp(json, 0, 1600, 1000));
      writeFileSync(
        path.join(dir, `${id}-stamp.webp`),
        await render.renderCropWebp(json, 0, 2, SCENE_CROP, 400, 500),
      );
    } else if (id !== '00-airmail') {
      const dir = path.join(root, 'assets/lottie/stills/stamps');
      mkdirSync(dir, { recursive: true });
      writeFileSync(path.join(dir, `${id}-confirmed.webp`), await render.renderWebp(json, 18, 288, 336));
    }
    console.log(`     still ${kind === 'scene' ? '1600x1000 + stamp crop' : '288x336 @ frame 18'}`);
  } catch (error) {
    console.log(`     still error: ${error.message}`);
  }
}

for (const scene of scenes) {
  if (!wants(scene.id)) continue;
  const json = scene.build();
  const ok = emit('assets/lottie/scenes', scene.id, json, { palette: scene.palette });
  if (ok && wants(scene.id)) await emitStills(scene.id, json, 'scene');
}

if (!args.length || args.includes('stamps')) {
  for (const stamp of stamps) {
    const json = stamp.build();
    const ok = emit('assets/lottie/stamps', stamp.id, json, {
      w: 96,
      h: 112,
      op: 36,
      sceneNames: false,
      loop: false,
      maxBytes: 40 * 1000,
      maxLayers: 12,
      budget: null,
    });
    if (ok) await emitStills(stamp.id, json, 'stamp');
  }
}

if (failed) {
  console.error(`\n${failed} file(s) failed validation`);
  process.exit(1);
}