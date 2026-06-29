interface LogoProps {
  className?: string;
  variant?: 'dark' | 'light';
}

export function Logo({ className = '', variant = 'dark' }: LogoProps) {
  const textColor = variant === 'light' ? 'text-white' : 'text-gray-900';
  const wColor = variant === 'light' ? 'text-white' : 'text-blue-600';

  return (
    <span className={`font-bold text-2xl tracking-tight ${textColor} ${className}`}>
      <span className={`${wColor}`}>W</span>ebYes
    </span>
  );
}
