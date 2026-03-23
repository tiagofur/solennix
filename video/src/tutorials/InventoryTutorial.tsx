import React from 'react';
import { AbsoluteFill } from 'remotion';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { SCENE_FRAMES, TRANSITION_FRAMES, COLORS } from '../constants';
import { InventoryTutorialProps } from '../schema';
import { IntroScene } from '../scenes/IntroScene';
import { NavigationScene } from '../scenes/NavigationScene';
import { InventoryListScene } from '../scenes/InventoryListScene';
import { InventoryFormFillScene } from '../scenes/InventoryFormFillScene';
import { SaveScene } from '../scenes/SaveScene';
import { OutroScene } from '../scenes/OutroScene';

export const InventoryTutorial: React.FC<InventoryTutorialProps> = (props) => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={SCENE_FRAMES.intro}>
          <IntroScene title="Cómo crear un ítem de inventario" />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />
        <TransitionSeries.Sequence durationInFrames={SCENE_FRAMES.navigation}>
          <NavigationScene targetItem="Inventario" />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />
        <TransitionSeries.Sequence durationInFrames={SCENE_FRAMES.clientList}>
          <InventoryListScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />
        <TransitionSeries.Sequence durationInFrames={SCENE_FRAMES.formFill}>
          <InventoryFormFillScene {...props} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />
        <TransitionSeries.Sequence durationInFrames={SCENE_FRAMES.save}>
          <SaveScene successMessage="¡Ítem creado con éxito!" />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />
        <TransitionSeries.Sequence durationInFrames={SCENE_FRAMES.outro}>
          <OutroScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
