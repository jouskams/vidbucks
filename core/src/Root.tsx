import { Composition, Still } from "remotion";
import { REGISTRY } from "./registry";
import { StickVideo, ThumbView } from "./engine/Video";
import { TemplateCompositions } from "./templates";

// 1) the reference-to-video templates (src/templates): one demo composition each - copy, change the config, register your own below.
// 2) the stickman/doodle long-form engine: every folder in videos/ is registered by tools/register.mjs (src/registry.ts).
export const Root: React.FC = () => (
  <>
    <TemplateCompositions />
    {REGISTRY.map((r) => (
      <Composition key={r.cfg.id} id={r.cfg.id} component={StickVideo as React.FC<any>} defaultProps={{ cfg: r.cfg, scenes: r.scenes, timing: r.timing }}
        width={r.cfg.width ?? 1920} height={r.cfg.height ?? 1080} fps={30} durationInFrames={Math.round(r.timing.duration * 30) + 90} />
    ))}
    {REGISTRY.filter((r) => r.thumb).map((r) => (
      <Still key={r.cfg.id + "Thumb"} id={r.cfg.id + "Thumb"} component={ThumbView as React.FC<any>} defaultProps={{ thumb: r.thumb, timing: r.timing }} width={1280} height={720} />
    ))}
  </>
);
