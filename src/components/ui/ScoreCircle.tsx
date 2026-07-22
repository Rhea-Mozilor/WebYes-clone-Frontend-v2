import { scoreColorPair } from '../../lib/score';

interface ScoreCircleProps {
  score: number;
  label: string;
  size?: 'sm' | 'md' | 'lg';
}

export function ScoreCircle({ score, label, size = 'md' }: ScoreCircleProps) {
  const { stroke, text } = scoreColorPair(score);
  const sizes = { sm: 64, md: 88, lg: 120 };
  const px = sizes[size];
  const radius = px * 0.38;
  const circumference = 2 * Math.PI * radius;
  const dash = (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={px} height={px} viewBox={`0 0 ${px} ${px}`}>
        <circle
          cx={px / 2}
          cy={px / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={size === 'lg' ? 8 : 6}
        />
        <circle
          cx={px / 2}
          cy={px / 2}
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth={size === 'lg' ? 8 : 6}
          strokeDasharray={`${dash} ${circumference - dash}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${px / 2} ${px / 2})`}
        />
        <text
          x={px / 2}
          y={px / 2}
          dominantBaseline="middle"
          textAnchor="middle"
          fontSize={size === 'lg' ? 24 : size === 'md' ? 18 : 14}
          fontWeight="700"
          fill={text}
        >
          {score}
        </text>
      </svg>
      <span className="text-xs text-gray-500 text-center leading-tight">{label}</span>
    </div>
  );
}
