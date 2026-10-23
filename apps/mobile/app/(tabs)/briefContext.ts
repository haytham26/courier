/**
 * The Courier Voice of the tabs, for the screens on the bar.
 *
 * The floating bar owns the one `useCourierVoice` of the tab layout (the
 * sphere and the caption read it there, and the shift starts once per
 * courier, not once per screen). The route files cannot take props from
 * their layout, so the hook rides a context this module holds. A screen
 * that needs the morning brief - like Today - reads it here.
 */
import React from 'react';

import type { CourierVoiceApi } from '@/voice/useCourierVoice';

export const BriefContext = React.createContext<CourierVoiceApi | null>(null);

export const useBriefOfTabs = (): CourierVoiceApi | null => React.useContext(BriefContext);
