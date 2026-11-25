import type { CompanionState } from './companionMotion';
import { ROBOT_COLORS as color, ROBOT_RIG } from './companionRig';

// Project-authored vector reconstruction of the robot in the user's attached image.
// The reference supplies the design; no externally hosted Codex art is used.
const cloud = 'M39 57C35 47 40 37 48 31C57 24 74 23 85 33C96 25 111 31 118 42C121 46 122 51 122 54C139 56 148 70 144 85L141 96C147 109 138 122 121 129C104 137 59 139 40 128C26 124 17 111 21 98C12 90 14 72 23 63C27 59 33 57 39 57Z';

function RobotLeg({ side, id }: { side: 'left' | 'right'; id: string }) {
  const x = side === 'left' ? 65 : 95;
  return <g data-rig={`${side}Hip`} transform={`rotate(0 ${ROBOT_RIG[`${side}Hip`]})`}>
    <path d={`M${x - 8} 168Q${x} 163 ${x + 8} 168V184Q${x} 189 ${x - 8} 184Z`} fill={`url(#${id}-body)`} stroke={color.outline} strokeWidth="2" />
    <g data-rig={`${side}Knee`} transform={`rotate(0 ${ROBOT_RIG[`${side}Knee`]})`}>
      <path d={`M${x - 7} 176H${x + 7}V188H${x - 7}Z`} fill={color.blue} />
      <g data-rig={`${side}Foot`} transform={`rotate(0 ${ROBOT_RIG[`${side}Foot`]})`}>
        <path d={`M${x - 9} 182Q${x} 180 ${x + 8} 184V190Q${x + 8} 194 ${x + 3} 194H${x - 8}Q${x - 12} 193 ${x - 11} 188Z`} fill={`url(#${id}-body)`} stroke={color.outline} strokeWidth="2" />
        <path d={`M${x - 7} 186H${x + 4}`} stroke={color.light} strokeWidth="1.4" opacity=".7" />
      </g>
    </g>
  </g>;
}

function RobotArm({ side, id }: { side: 'left' | 'right'; id: string }) {
  const left = side === 'left';
  const x = left ? 42 : 118;
  return <g data-rig={`${side}Arm`} transform={`rotate(${left ? 6 : -6} ${ROBOT_RIG[`${side}Arm`]})`}>
    <path d={left ? 'M45 138Q51 136 53 142L48 156Q44 161 38 157Q34 154 37 148Z' : 'M107 142Q109 136 115 138L123 148Q127 154 122 157Q116 161 112 156Z'} fill={`url(#${id}-body)`} stroke={color.outline} strokeWidth="2" />
    <path d={left ? 'M45 141L40 151' : 'M115 141L120 151'} stroke={color.light} strokeWidth="1.6" opacity=".6" />
    <g data-rig={`${side}Elbow`} transform={`rotate(${left ? -8 : 8} ${ROBOT_RIG[`${side}Elbow`]})`}>
      <path d={`M${x - 5} 151Q${x} 148 ${x + 5} 153L${x + 6} 168Q${x + 5} 176 ${x} 176Q${x - 7} 175 ${x - 7} 170Z`} fill={`url(#${id}-body)`} stroke={color.outline} strokeWidth="2" />
      <path d={`M${x - 3} 170V174M${x + 1} 170V174`} stroke={color.shade} strokeWidth="1" opacity=".65" />
    </g>
  </g>;
}

export function CompanionArtwork({ id, state = 'idle' }: { id: string; state?: CompanionState }) {
  return <>
    <defs>
      <linearGradient id={`${id}-head`} x1="0" y1="0" x2=".25" y2="1"><stop stopColor={color.light} /><stop offset=".48" stopColor="#7294f7" /><stop offset="1" stopColor="#5874df" /></linearGradient>
      <linearGradient id={`${id}-body`} x1="0" y1="0" x2=".75" y2="1"><stop stopColor="#86a8fc" /><stop offset=".45" stopColor={color.blue} /><stop offset="1" stopColor={color.shade} /></linearGradient>
    </defs>
    <ellipse data-rig="shadow" cx="80" cy="196" rx="31" ry="3" fill={color.outline} opacity=".13" />
    <g data-rig="turn"><g data-rig="body">
      <RobotLeg side="left" id={id} /><RobotLeg side="right" id={id} />
      <g data-rig="breath">
        <path d="M66 129H97V142H66Z" fill={color.shade} stroke={color.outline} strokeWidth="2" />
        <path data-robot="torso" d="M62 137H98Q109 137 109 148V163Q108 173 98 173H62Q51 173 51 162V148Q51 137 62 137Z" fill={`url(#${id}-body)`} stroke={color.outline} strokeWidth="2.3" />
        <path d="M59 142H101M55 148V158" stroke="#adc5ff" strokeWidth="1.6" opacity=".6" />
        <path d="M60 170Q80 174 101 170" stroke="#415bb9" strokeWidth="2" fill="none" />
        <g data-robot="chest-terminal" fill="#c2eaff"><path d="M69 146H73V149H77V152H81V156H77V159H73V161H69V157H73V154H77V153H73V151H69Z" /><path d="M88 155H104V159H88Z" /></g>
      </g>
      <g data-rig="head">
        <path d={cloud} transform="translate(0 2)" fill={color.outline} />
        <path data-robot="cloud-head" d={cloud} fill={`url(#${id}-head)`} stroke="#354b98" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M46 39Q58 23 76 30M92 34Q106 28 116 42" fill="none" stroke="#b2cdff" strokeWidth="1.8" opacity=".65" />
        <path d="M24 101Q23 117 44 127H59M138 104Q140 120 121 127" fill="none" stroke="#4b61c0" strokeWidth="2.5" />
        <rect x="43" y="65" width="87" height="59" rx="15" fill="#31418b" />
        <rect data-robot="screen" x="46" y="65" width="82" height="57" rx="12" fill={color.screen} stroke="#172253" strokeWidth="2" />
        <g data-rig="brows"><path d="M59 67H113Q121 67 125 75" stroke="#5268b2" strokeWidth="1.4" fill="none" opacity=".6" /></g>
        <g data-rig="gaze" fill={color.cyan}>
          <g data-rig="eyes" opacity={state === 'success' ? .25 : 1}>
            <path data-robot="chevron" d="M61 79H66V83H70V87H74V94H70V98H66V102H61V96H65V93H68V90H65V87H61Z" />
          </g>
          <path data-rig="mouth" data-robot="cursor" d="M96 100H113V105H96Z" />
          <g data-rig="activity" opacity={state === 'thinking' ? 1 : 0}>{[84, 94, 104].map((x) => <rect key={x} x={x} y="85" width="4" height="4" rx="1" opacity=".6" />)}</g>
          {state === 'success' && <path d="M83 87L89 93L101 80" stroke={color.cyan} strokeWidth="4" strokeLinejoin="round" fill="none" />}
          {state === 'error' && <path d="M88 81V91M88 95V98" stroke={color.cyan} strokeWidth="3" opacity=".8" />}
        </g>
      </g>
      <RobotArm side="right" id={id} /><RobotArm side="left" id={id} />
    </g></g>
  </>;
}
