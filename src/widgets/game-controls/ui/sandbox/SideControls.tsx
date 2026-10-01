import {
  AI_PROFILE_TYPES,
  AI_PROFILES,
  OWNER_NAME,
  type AiProfile,
  type Controller,
  type ParticipantId,
  type SandboxSide,
} from '@shared/config';

const CONTROLLERS: { value: Controller; label: string }[] = [
  { value: 'human', label: 'Человек' },
  { value: 'ai', label: 'ИИ' },
  { value: 'passive', label: 'Пассивная' },
];

type Props = {
  owner: ParticipantId;
  side: SandboxSide;
  onChange: (side: SandboxSide) => void;
};

/** Управление стороной сценария и, для ИИ, его профиль. */
export const SideControls = ({ owner, side, onChange }: Props) => (
  <>
    <select
      aria-label={`Управление: ${OWNER_NAME[owner]}`}
      value={side.controller}
      onChange={e =>
        onChange({ ...side, controller: e.target.value as Controller })
      }
    >
      {CONTROLLERS.map(({ value, label }) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
    {side.controller === 'ai' && (
      <select
        aria-label={`Профиль ИИ: ${OWNER_NAME[owner]}`}
        value={side.profile ?? 'balanced'}
        onChange={e =>
          onChange({ ...side, profile: e.target.value as AiProfile })
        }
      >
        {AI_PROFILE_TYPES.map(profile => (
          <option key={profile} value={profile}>
            {AI_PROFILES[profile].name}
          </option>
        ))}
      </select>
    )}
  </>
);
