import Login1 from './svgicons/login/login1.png'
import Login2 from './svgicons/login/login2.png'
import Login3 from './svgicons/login/login3.png'
import Login4 from './svgicons/login/login4.png'

// The login/signup left panel used to layer 4 independently absolute-positioned
// <img> tags, each placed with its own left/top/width percentages. Percentages on
// separate elements are each relative to the (possibly non-matching) current box
// shape, so when the panel's own aspect ratio changes — e.g. opening DevTools
// shrinks the viewport width but not the height — the cards drift apart and
// overlap each other. Compositing everything into one SVG with a fixed viewBox
// (matching the original 773x929 Figma frame) makes the whole group scale and
// reposition together as a single rigid image, so relative positions never drift.
export function LoginHeroArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 773 929" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden="true">
      <defs>
        <clipPath id="loginHeroCard1Clip">
          <rect x={84} y={207} width={362} height={335.4} rx={12} />
        </clipPath>
        <clipPath id="loginHeroCard3Clip">
          <rect x={373} y={172} width={284} height={105.1} rx={7} />
        </clipPath>
      </defs>

      {/* Background photo */}
      <image href={Login4} x={0} y={0} width={773} height={929} preserveAspectRatio="xMidYMid slice" />

      {/* Issues-per-page card */}
      <image
        href={Login1}
        x={84} y={207} width={362} height={335.4}
        preserveAspectRatio="none"
        clipPath="url(#loginHeroCard1Clip)"
        style={{ filter: 'drop-shadow(0px 0px 20px rgba(0,0,0,0.35))' }}
      />

      {/* Level-A/AA/AAA card */}
      <image
        href={Login2}
        x={305} y={355} width={281} height={268.5}
        preserveAspectRatio="none"
        style={{ filter: 'drop-shadow(-3px 0px 16px rgba(22,43,149,0.1))' }}
      />

      {/* Toast card */}
      <image
        href={Login3}
        x={373} y={172} width={284} height={105.1}
        preserveAspectRatio="none"
        clipPath="url(#loginHeroCard3Clip)"
        style={{ filter: 'drop-shadow(-3.5px 2.6px 12px rgba(16,6,57,0.12))' }}
      />
    </svg>
  )
}
