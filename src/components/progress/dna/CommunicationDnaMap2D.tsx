import { Box } from 'lucide-react';
import type {
  DnaNodeVisualState,
  DnaSkillId,
  DnaSkillNode,
} from '../../../domain/communicationDnaLabEngine';
import { useLanguage } from '../../../i18n/LanguageContext';

interface CommunicationDnaMap2DProps {
  skills: DnaSkillNode[];
  selectedSkillId: DnaSkillId;
  onSelectSkill: (id: DnaSkillId) => void;
  onSwitchTo3D: () => void;
}

// Clean spatial layout across a 920 x 460 viewBox around the central DNA double helix
const NODE_POSITIONS_2D: Record<DnaSkillId, { x: number; y: number }> = {
  speaking: { x: 460, y: 68 },
  grammar: { x: 215, y: 126 },
  vocabulary: { x: 705, y: 126 },
  pronunciation: { x: 300, y: 215 },
  functional_communication: { x: 620, y: 215 },
  listening: { x: 148, y: 282 },
  reading: { x: 772, y: 282 },
  sentence_complexity: { x: 265, y: 368 },
  contextual_appropriateness: { x: 655, y: 368 },
  writing: { x: 460, y: 404 },
};

const STATE_COLOR: Record<
  DnaNodeVisualState,
  { stroke: string; fill: string; text: string; labelEn: string; labelBn: string }
> = {
  strong: {
    stroke: '#00D9FF',
    fill: 'rgba(0, 217, 255, 0.16)',
    text: '#67E8F9',
    labelEn: 'Strong',
    labelBn: 'শক্তিশালী',
  },
  developing: {
    stroke: '#3B82F6',
    fill: 'rgba(59, 130, 246, 0.16)',
    text: '#93C5FD',
    labelEn: 'Developing',
    labelBn: 'উন্নয়নশীল',
  },
  needs_attention: {
    stroke: '#F59E0B',
    fill: 'rgba(245, 158, 11, 0.16)',
    text: '#FCD34D',
    labelEn: 'Focus',
    labelBn: 'মনোযোগ',
  },
  insufficient: {
    stroke: '#64748B',
    fill: 'rgba(71, 85, 105, 0.16)',
    text: '#94A3B8',
    labelEn: 'No Data',
    labelBn: 'অপরিমাপকৃত',
  },
};

export function CommunicationDnaMap2D({
  skills,
  selectedSkillId,
  onSelectSkill,
  onSwitchTo3D,
}: CommunicationDnaMap2DProps) {
  const { lang } = useLanguage();

  const seenEdges = new Set<string>();
  const edges: Array<{ from: { x: number; y: number }; to: { x: number; y: number }; key: string }> =
    [];

  for (const skill of skills) {
    const pA = NODE_POSITIONS_2D[skill.id];
    for (const targetId of skill.connectedTo) {
      const key = [skill.id, targetId].sort().join('--');
      if (seenEdges.has(key)) continue;
      seenEdges.add(key);
      const pB = NODE_POSITIONS_2D[targetId];
      if (pA && pB) {
        edges.push({ from: pA, to: pB, key });
      }
    }
  }

  return (
    <div
      data-testid="dna-2d-map-container"
      data-selected-skill={selectedSkillId}
      className="relative overflow-hidden rounded-2xl border border-cyan-400/25 bg-[#060C24] p-4 sm:p-5"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-cyan-300">
            {lang === 'bn'
              ? '2D অ্যাক্সেসিবল কমিউনিকেশন নিউরাল ম্যাপ'
              : '2D Accessible Communication Neural Map'}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            {lang === 'bn'
              ? 'কম পাওয়ার ডিভাইস ও কীবোর্ড নেভিগেশনের জন্য অপ্টিমাইজড — যেকোনো নোড নির্বাচন করুন।'
              : 'Lightweight high-contrast neural layout — click or tab to any skill node to inspect evidence.'}
          </p>
        </div>

        <button
          type="button"
          onClick={onSwitchTo3D}
          data-testid="toggle-3d-dna-map"
          className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/35 bg-[#0C1840] px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:border-cyan-400/60 hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Box className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
          <span>{lang === 'bn' ? '3D হেলিক্স ভিউতে ফিরুন' : 'Return to 3D Helix'}</span>
        </button>
      </div>

      {/* Interactive SVG Neural Graph */}
      <div className="relative mx-auto w-full overflow-x-auto">
        <svg
          viewBox="0 0 920 460"
          role="img"
          aria-label={
            lang === 'bn'
              ? '১০টি যোগাযোগ দক্ষতার 2D নিউরাল ম্যাপ'
              : 'Interactive 2D neural map of 10 communication skill dimensions'
          }
          className="h-auto w-full min-w-[640px]"
        >
          <defs>
            <radialGradient id="dna2dCoreGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#00D9FF" stopOpacity="0.28" />
              <stop offset="55%" stopColor="#8050FF" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#060C24" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="dnaHelixStrandA" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#00D9FF" />
              <stop offset="100%" stopColor="#2864FF" />
            </linearGradient>
            <linearGradient id="dnaHelixStrandB" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#B44DFF" />
              <stop offset="100%" stopColor="#00D9FF" />
            </linearGradient>
          </defs>

          {/* Subtle ambient radial core aura */}
          <circle cx="460" cy="232" r="170" fill="url(#dna2dCoreGlow)" />

          {/* Concentric orbital reference rings */}
          <circle
            cx="460"
            cy="232"
            r="118"
            fill="none"
            stroke="rgba(0,217,255,0.16)"
            strokeDasharray="4 6"
          />
          <circle
            cx="460"
            cy="232"
            r="204"
            fill="none"
            stroke="rgba(128,80,255,0.14)"
            strokeDasharray="3 8"
          />

          {/* Central stylized 2D DNA double helix spine */}
          <path
            d="M 434 128 C 492 162, 428 198, 486 232 C 428 266, 492 302, 434 336"
            fill="none"
            stroke="url(#dnaHelixStrandA)"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.85"
          />
          <path
            d="M 486 128 C 428 162, 492 198, 434 232 C 492 266, 428 302, 486 336"
            fill="none"
            stroke="url(#dnaHelixStrandB)"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.85"
          />
          {[148, 176, 204, 232, 260, 288, 316].map((yPos, idx) => (
            <line
              key={yPos}
              x1={idx % 2 === 0 ? 444 : 448}
              y1={yPos}
              x2={idx % 2 === 0 ? 476 : 472}
              y2={yPos}
              stroke="rgba(165, 243, 252, 0.45)"
              strokeWidth="1.5"
            />
          ))}

          {/* Core Spokes */}
          {skills.map((skill) => {
            const p = NODE_POSITIONS_2D[skill.id];
            const isSelected = skill.id === selectedSkillId;
            return (
              <line
                key={`spoke_${skill.id}`}
                x1="460"
                y1="232"
                x2={p.x}
                y2={p.y}
                stroke={isSelected ? '#00D9FF' : 'rgba(128, 80, 255, 0.24)'}
                strokeWidth={isSelected ? 2 : 1.1}
              />
            );
          })}

          {/* Inter-Skill Neural Pathways */}
          {edges.map((edge) => {
            const mx = (edge.from.x + edge.to.x) / 2;
            const my = (edge.from.y + edge.to.y) / 2 - 14;
            return (
              <path
                key={edge.key}
                d={`M ${edge.from.x} ${edge.from.y} Q ${mx} ${my} ${edge.to.x} ${edge.to.y}`}
                fill="none"
                stroke="rgba(56, 189, 248, 0.24)"
                strokeWidth="1.2"
              />
            );
          })}

          {/* Interactive Skill Nodes */}
          {skills.map((skill) => {
            const p = NODE_POSITIONS_2D[skill.id];
            const palette = STATE_COLOR[skill.visualState];
            const isSelected = skill.id === selectedSkillId;
            const title = lang === 'bn' ? skill.shortLabelBn : skill.shortLabelEn;
            const scoreStr =
              skill.scorePercent !== null
                ? `${skill.scorePercent}%`
                : `${skill.sampleSize}/3`;

            return (
              <g
                key={skill.id}
                role="button"
                tabIndex={0}
                aria-label={`${lang === 'bn' ? skill.titleBn : skill.titleEn}: ${
                  skill.scorePercent !== null
                    ? `${skill.scorePercent}%`
                    : lang === 'bn'
                      ? 'পর্যাপ্ত মূল্যায়ন তথ্য নেই'
                      : 'Not enough assessment data'
                }`}
                aria-pressed={isSelected}
                onClick={() => onSelectSkill(skill.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectSkill(skill.id);
                  }
                }}
                className="cursor-pointer focus:outline-none"
              >
                {isSelected && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="38"
                    fill="none"
                    stroke="#00D9FF"
                    strokeWidth="2"
                    strokeDasharray="5 4"
                  />
                )}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="30"
                  fill="#0A1438"
                  stroke={isSelected ? '#00D9FF' : palette.stroke}
                  strokeWidth={isSelected ? 2.5 : 1.75}
                />
                <circle cx={p.x} cy={p.y} r="25" fill={palette.fill} />
                <text
                  x={p.x}
                  y={p.y - 3}
                  textAnchor="middle"
                  fill="#F5F7FF"
                  fontSize="11.5"
                  fontWeight="700"
                >
                  {scoreStr}
                </text>
                <text
                  x={p.x}
                  y={p.y + 12}
                  textAnchor="middle"
                  fill={palette.text}
                  fontSize="9"
                  fontWeight="600"
                >
                  {lang === 'bn' ? palette.labelBn : palette.labelEn}
                </text>
                <text
                  x={p.x}
                  y={p.y + 45}
                  textAnchor="middle"
                  fill={isSelected ? '#FFFFFF' : '#CBD5E1'}
                  fontSize="11.5"
                  fontWeight={isSelected ? '700' : '600'}
                >
                  {title}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
