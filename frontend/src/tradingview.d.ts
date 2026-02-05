/**
 * TradingView Widget TypeScript Declarations
 */

declare namespace JSX {
  interface IntrinsicElements {
    'tv-ticker-tape': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
      symbols?: string;
      colorTheme?: 'light' | 'dark';
    }, HTMLElement>;
  }
}
