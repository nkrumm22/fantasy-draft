export const SPORT_COLORS = {
  nfl: { accent: '#e53e3e', soft: '#fc8181', dim: 'rgba(229,62,62,0.10)', glow: 'rgba(229,62,62,0.22)' },
  nba: { accent: '#3182ce', soft: '#63b3ed', dim: 'rgba(49,130,206,0.10)', glow: 'rgba(49,130,206,0.22)' },
  mlb: { accent: '#dd6b20', soft: '#f6ad55', dim: 'rgba(221,107,32,0.10)', glow: 'rgba(221,107,32,0.22)' },
  nhl: { accent: '#63b3ed', soft: '#90cdf4', dim: 'rgba(99,179,237,0.10)', glow: 'rgba(99,179,237,0.22)' },
  epl: { accent: '#805ad5', soft: '#b794f4', dim: 'rgba(128,90,213,0.10)', glow: 'rgba(128,90,213,0.22)' },
};

export function getSportColors(sport) {
  return SPORT_COLORS[sport] || SPORT_COLORS.nfl;
}
