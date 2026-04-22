type MapLegendProps = {
  title: string;
  palette: readonly string[];
  breaks: number[];
  formatter: (value: number) => string;
};

const MapLegend = ({ title, palette, breaks, formatter }: MapLegendProps) => (
  <div className="map-legend">
    <p className="map-legend__title">{title}</p>
    <ul className="map-legend__list">
      {palette.map((color, index) => {
        const start = index === 0 ? null : breaks[index - 1];
        const end = breaks[index];
        const label =
          start == null
            ? `Up to ${formatter(end)}`
            : end == null
              ? `${formatter(start)} and above`
              : `${formatter(start)} to ${formatter(end)}`;
        return (
          <li key={`${color}-${index}`}>
            <span className="map-legend__swatch" style={{ backgroundColor: color }} />
            <span>{label}</span>
          </li>
        );
      })}
    </ul>
  </div>
);

export default MapLegend;
