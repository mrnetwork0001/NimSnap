import React from 'react'
import { Composition } from 'remotion'
import { NimSnap, NIMSNAP_DURATION } from './NimSnap'

export const RemotionRoot: React.FC = () => (
  <Composition
    id="NimSnap"
    component={NimSnap}
    durationInFrames={NIMSNAP_DURATION}
    fps={30}
    width={1920}
    height={1080}
  />
)
