import React from 'react';
import { AbsoluteFill } from 'remotion';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { COTIZACION_SCENE_FRAMES, TRANSITION_FRAMES, COLORS } from '../constants';
import { CotizacionTutorialProps } from '../schema';
import { IntroScene } from '../scenes/IntroScene';
import { NavigationScene } from '../scenes/NavigationScene';
import { CotizacionFormFillScene } from '../scenes/CotizacionFormFillScene';
import { SaveScene } from '../scenes/SaveScene';
import { OutroScene } from '../scenes/OutroScene';

export const CotizacionTutorial: React.FC<CotizacionTutorialProps> = (props) => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <TransitionSeries>
        {/* ── Step 1: Intro ── */}
        <TransitionSeries.Sequence durationInFrames={COTIZACION_SCENE_FRAMES.intro}>
          <IntroScene title="Cómo crear una cotización" />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />

        {/* ── Step 2: Navigate to Cotización in sidebar ── */}
        <TransitionSeries.Sequence durationInFrames={COTIZACION_SCENE_FRAMES.navigation}>
          <NavigationScene targetItem="Cotización" />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />

        {/* ── Step 3: Multi-step form (General → Products → Financials) ── */}
        <TransitionSeries.Sequence durationInFrames={COTIZACION_SCENE_FRAMES.formFill}>
          <CotizacionFormFillScene {...props} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />

        {/* ── Step 4: Save confirmation ── */}
        <TransitionSeries.Sequence durationInFrames={COTIZACION_SCENE_FRAMES.save}>
          <SaveScene successMessage="¡Cotización creada con éxito!" />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />

        {/* ── Step 5: Outro ── */}
        <TransitionSeries.Sequence durationInFrames={COTIZACION_SCENE_FRAMES.outro}>
          <OutroScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
