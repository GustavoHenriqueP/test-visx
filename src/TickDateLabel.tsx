import { TickRendererProps } from '@visx/axis/lib/types';

const TickDateLabel = ({
  dy,
  fill,
  fontFamily,
  fontSize,
  formattedValue,
  textAnchor,
  x,
  y,
}: TickRendererProps) => {
  return (
    <svg x="0" y={dy} fontSize={fontSize} style={{ overflow: 'visible' }}>
      <text
        transform=""
        x={x}
        y={y}
        fontFamily={fontFamily}
        fontSize={fontSize}
        fill={fill}
        textAnchor={textAnchor}
      >
        <tspan x={x} dy="0em">
          {formattedValue?.split(' ')[0]}
        </tspan>
      </text>
      <text
        transform=""
        x={x}
        y={y + 12}
        fontFamily={fontFamily}
        fontSize={fontSize}
        fill={fill}
        textAnchor={textAnchor}
      >
        <tspan x={x} dy="0em">
          {formattedValue?.split(' ')[1]}
        </tspan>
      </text>
    </svg>
  );
};

export default TickDateLabel;
