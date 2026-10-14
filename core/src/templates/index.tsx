// Registry of the templates: one demo composition each. Copy a demo config (demos.ts), change the content, add a line here.
import React from "react";
import { Composition } from "remotion";
import { IconStory } from "./IconStory";
import { ObjectStory } from "./ObjectStory";
import { KineticType, kineticDuration } from "./KineticType";
import { ParticleBloom } from "./ParticleBloom";
import { iconStoryDemo, kineticDemo, objectStoryDemo, particleDemo } from "./demos";

export const TemplateCompositions: React.FC = () => (
  <>
    <Composition id="Tpl-IconStory" component={IconStory as React.FC<any>} defaultProps={{ cfg: iconStoryDemo }} width={iconStoryDemo.width} height={iconStoryDemo.height} fps={iconStoryDemo.fps} durationInFrames={Math.round(iconStoryDemo.durationSec * iconStoryDemo.fps)} />
    <Composition id="Tpl-ObjectStory" component={ObjectStory as React.FC<any>} defaultProps={{ cfg: objectStoryDemo }} width={objectStoryDemo.width} height={objectStoryDemo.height} fps={objectStoryDemo.fps} durationInFrames={Math.round(objectStoryDemo.durationSec * objectStoryDemo.fps)} />
    <Composition id="Tpl-KineticType-Vertical" component={KineticType as React.FC<any>} defaultProps={{ cfg: kineticDemo }} width={kineticDemo.width} height={kineticDemo.height} fps={kineticDemo.fps} durationInFrames={kineticDuration(kineticDemo)} />
    <Composition id="Tpl-KineticType-Horizontal" component={KineticType as React.FC<any>} defaultProps={{ cfg: { ...kineticDemo, width: 1920, height: 1080 } }} width={1920} height={1080} fps={kineticDemo.fps} durationInFrames={kineticDuration(kineticDemo)} />
    <Composition id="Tpl-ParticleBloom" component={ParticleBloom as React.FC<any>} defaultProps={{ cfg: particleDemo }} width={particleDemo.width} height={particleDemo.height} fps={particleDemo.fps} durationInFrames={Math.round(particleDemo.durationSec * particleDemo.fps)} />
  </>
);
