import {
  AI_PROFILE_TYPES,
  AI_PROFILES,
  OWNER_NAME,
  type AiProfile,
  type Controller,
  type ParticipantId,
  type SandboxSide,
} from '@shared/config';
import { Select } from '@shared/ui';

const CONTROLLERS: readonly { value: Controller; label: string }[] = [
  { value: 'human', label: 'Человек' },
  { value: 'ai', label: 'ИИ' },
  { value: 'passive', label: 'Пассивная' },
];

const PROFILE_OPTIONS = AI_PROFILE_TYPES.map(profile => ({
  value: profile,
  label: AI_PROFILES[profile].name,
}));

type Props = {
  owner: ParticipantId;
  side: SandboxSide;
  onChange: (side: SandboxSide) => void;
};

/** Управление стороной сценария и, для ИИ, его профиль. */
export const SideControls = ({ owner, side, onChange }: Props) => (
  <>
    <Select
      aria-label={`Управление: ${OWNER_NAME[owner]}`}
      value={side.controller}
      options={CONTROLLERS}
      onChange={controller => onChange({ ...side, controller })}
    />
    {side.controller === 'ai' && (
      <Select<AiProfile>
        aria-label={`Профиль ИИ: ${OWNER_NAME[owner]}`}
        value={side.profile ?? 'balanced'}
        options={PROFILE_OPTIONS}
        onChange={profile => onChange({ ...side, profile })}
      />
    )}
  </>
);
