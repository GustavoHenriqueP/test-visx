import { appleStock } from '@visx/mock-data';
import { AppleStock } from '@visx/mock-data/lib/mocks/appleStock';
import { bisector, extent } from '@visx/vendor/d3-array';
import { timeFormat } from '@visx/vendor/d3-time-format';
import { TooltipWithBounds, defaultStyles, useTooltip } from '@visx/tooltip';
import { useCallback, useMemo, useRef } from 'react';
import { scaleLinear, scaleTime } from '@visx/scale';
import { localPoint } from '@visx/event';
import { LinearGradient } from '@visx/gradient';
import { GridRows } from '@visx/grid';
import { AreaClosed, Bar, Line, LinePath } from '@visx/shape';
import { curveMonotoneX } from '@visx/curve';
import { Group } from '@visx/group';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { Zoom } from '@visx/zoom';
import { RectClipPath } from '@visx/clip-path';
import { TransformMatrix } from '@visx/zoom/lib/types';
import { ScaleLinear, ScaleTime } from '@visx/vendor/d3-scale';

// dataset
const data = appleStock.slice(appleStock.length - 340);

// tooltip
// const tooltipStyles: React.CSSProperties = {
//   ...defaultStyles,
//   backgroundColor: '#ddd',
//   border: '1px solid #bbb',
//   color: '#333',
//   borderRadius: '6px',
//   opacity: '0.9',
// };

// styles
const tooltipStyles: React.CSSProperties = {
  ...defaultStyles,
  backgroundColor: '#0c1629',
  border: '1px solid #bbb',
  color: '#fff',
  borderRadius: '6px',
  opacity: '0.8',
  padding: '0.5rem',
};

const axisColor = '#ddd';
const axisBottomTickLabelProps = {
  fontSize: 10,
  fill: axisColor,
};
const axisLeftTickLabelProps = {
  fontSize: 10,
  fill: axisColor,
  dx: '-0.5em',
  dy: '0.25em',
};

// utils
const formatDateTooltip = timeFormat('%B %d');
const formatDateAxis = timeFormat('%m/%d');

// accessors
const getXValue = (d: AppleStock) => new Date(d.date);
const getYValue = (d: AppleStock) => d.close;
const bisect = bisector<AppleStock, Date>((d) => new Date(d.date)).left;

const initialTransform = {
  scaleX: 1,
  scaleY: 1,
  translateX: 0,
  translateY: 0,
  skewX: 0,
  skewY: 0,
};

export type AreaProps = {
  width: number;
  height: number;
  margin?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
};

const AreaTest = ({
  width,
  height,
  margin = { top: 0, right: 0, bottom: 0, left: 0 },
}: AreaProps) => {
  const {
    showTooltip,
    hideTooltip,
    tooltipData,
    tooltipLeft = 0,
    tooltipTop = 0,
  } = useTooltip<AppleStock>();
  const showTooltipRef = useRef(showTooltip);
  const hideTooltipRef = useRef(hideTooltip);

  // bounds
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const xScale = useMemo(
    () =>
      scaleTime({
        range: [margin.left, innerWidth + margin.left],
        domain: extent(data, getXValue) as [Date, Date],
      }),
    [innerWidth, margin.left]
  );

  const yScale = useMemo(
    () =>
      scaleLinear({
        range: [margin.top + innerHeight, margin.top],
        domain: [0, Math.max(...data.map(getYValue)) + innerHeight / 10],
      }),
    [innerHeight, margin.top]
  );

  const xZoomScale = useCallback(
    (
      zoomTranslateX: number,
      zoomScaleX: number
    ): ScaleTime<number, number, never> => {
      const newDomainX = xScale.range().map((r) => {
        return xScale.invert((r - zoomTranslateX) / zoomScaleX);
      });
      return xScale.copy().domain(newDomainX);
    },
    [xScale]
  );

  const yZoomScale = useCallback(
    (
      zoomTranslateY: number,
      zoomScaleY: number
    ): ScaleLinear<number, number, never> => {
      const newDomainY = yScale.range().map((r) => {
        return yScale.invert((r - zoomTranslateY) / zoomScaleY);
      });
      return yScale.copy().domain(newDomainY);
    },
    [yScale]
  );

  // tooltip handler
  const lastEventType = useRef('');
  const handleTooltip = useCallback(
    (
      event:
        | React.TouchEvent<SVGRectElement>
        | React.MouseEvent<SVGRectElement>,
      transformMatrix: TransformMatrix
    ) => {
      const { x, y } = localPoint(event) || { x: 0, y: 0 };
      const x0 =
        transformMatrix.scaleX === 1 && transformMatrix.translateX === 0
          ? xScale.invert(x)
          : xZoomScale(
              transformMatrix.translateX,
              transformMatrix.scaleX
            ).invert(x);
      const index = bisect(data, x0, 1);
      const d0 = data[index - 1];
      const d1 = data[index];

      let d = d0;
      if (d1 && getXValue(d1)) {
        d =
          x0.valueOf() - getXValue(d0).valueOf() >
          getXValue(d1).valueOf() - x0.valueOf()
            ? d1
            : d0;
      }

      const tooltipTop =
        transformMatrix.scaleY === 1 && transformMatrix.translateY === 0
          ? yScale(getYValue(d))
          : yZoomScale(
              transformMatrix.translateY,
              transformMatrix.scaleY
            )(getYValue(d));
      const toleranceArea = innerHeight * 0.05;
      if (
        event.type === 'mousemove' &&
        lastEventType.current !== 'touchstart'
      ) {
        if (y >= tooltipTop - toleranceArea && y < tooltipTop + toleranceArea) {
          event.currentTarget.style.cursor = 'pointer';

          showTooltipRef.current({
            tooltipData: d,
            tooltipLeft: x,
            tooltipTop: tooltipTop,
          });
        } else {
          event.currentTarget.style.cursor = 'inherit';
          hideTooltipRef.current();
        }

        lastEventType.current = event.type;
      } else {
        showTooltipRef.current({
          tooltipData: d,
          tooltipLeft: x,
          tooltipTop: tooltipTop,
        });

        console.log(d);

        lastEventType.current = event.type;
      }
    },
    [innerHeight, xScale, yScale, xZoomScale, yZoomScale]
  );

  function constrain(
    transformMatrix: TransformMatrix,
    prevTransformMatrix: TransformMatrix
  ) {
    if (transformMatrix.scaleX <= 1) {
      return initialTransform;
    }
    if (transformMatrix.scaleX > 4) {
      return prevTransformMatrix;
    }

    // console.log(innerWidth - innerWidth * transformMatrix.scaleX);
    // console.log(width - width * transformMatrix.scaleX);
    // console.log(transformMatrix.translateX);
    // clamp translate so that the chart doesn't move inward when zooming out near edges
    return {
      ...transformMatrix,
      translateX: Math.min(
        0,
        Math.max(
          width - width * transformMatrix.scaleX,
          transformMatrix.translateX
        )
      ),
      translateY: Math.min(
        margin.top,
        Math.max(
          innerHeight - innerHeight * transformMatrix.scaleY,
          transformMatrix.translateY
        )
      ),
    };
  }

  // Prevenir erro com o primeiro render sendo width e height de 0
  if (width < 100) return null;
  return (
    <div style={{ position: 'relative' }}>
      <svg width={width} height={height}>
        <rect
          x={0}
          y={0}
          width={width}
          height={height}
          rx={24}
          fill="url(#area-bg-gradient)"
        />
        <LinearGradient id="area-bg-gradient" from="#3d4046" to="#363940" />
        <LinearGradient
          id="area-accent-gradient"
          from="#01b3f9"
          to="#01b3f9"
          fromOpacity={0.4}
          toOpacity={0.2}
        />
        <Group>
          <RectClipPath
            id="zoom-clip"
            x={margin.left}
            y={margin.top}
            width={innerWidth}
            height={innerHeight}
          />
          <Zoom<SVGSVGElement>
            width={innerWidth}
            height={innerHeight}
            constrain={constrain}
            initialTransformMatrix={initialTransform}
          >
            {(zoom) => {
              // console.log(zoom.transformMatrix);

              return (
                <>
                  <g
                    width={innerWidth}
                    height={innerHeight}
                    ref={zoom.containerRef}
                    style={{
                      position: 'relative',
                      cursor:
                        zoom.transformMatrix.scaleX === 1
                          ? 'inherit'
                          : zoom.isDragging
                          ? 'grabbing'
                          : 'grab',
                      touchAction: 'none',
                      clipPath: 'url(#zoom-clip)',
                    }}
                  >
                    <GridRows
                      left={margin.left}
                      scale={yScale}
                      width={innerWidth}
                      strokeDasharray="1,3"
                      stroke="#aaa"
                      strokeOpacity={0.2}
                      pointerEvents="none"
                      numTicks={8}
                    />
                    <g transform={zoom.toString()}>
                      <AreaClosed<AppleStock>
                        data={data}
                        x={(d) => xScale(getXValue(d)) ?? 0}
                        y={(d) => yScale(getYValue(d)) ?? 0}
                        yScale={yScale}
                        strokeWidth={1}
                        stroke="#url(#area-accent-gradient)"
                        fill="url(#area-accent-gradient)"
                        curve={curveMonotoneX}
                      />
                      <LinePath
                        data={data}
                        x={(d) => xScale(getXValue(d)) ?? 0}
                        y={(d) => yScale(getYValue(d)) ?? 0}
                        strokeWidth={
                          zoom.transformMatrix.scaleX > 2.5
                            ? 0.5
                            : zoom.transformMatrix.scaleX > 1.5
                            ? 1
                            : 2
                        }
                        stroke="#01b3f9"
                        curve={curveMonotoneX}
                      />
                      <Bar
                        x={margin.left}
                        y={margin.top}
                        width={innerWidth}
                        height={innerHeight}
                        fill="transparent"
                        rx={24}
                        onTouchStart={(event) =>
                          handleTooltip(event, zoom.transformMatrix)
                        }
                        onTouchMove={(event) =>
                          handleTooltip(event, zoom.transformMatrix)
                        }
                        onMouseMove={(event) =>
                          handleTooltip(event, zoom.transformMatrix)
                        }
                        onMouseLeave={() => hideTooltipRef.current()}
                        onWheel={() => hideTooltip()}
                      />
                    </g>
                  </g>
                  <Group>
                    <AxisBottom
                      top={innerHeight + margin.top}
                      scale={xZoomScale(
                        zoom.transformMatrix.translateX,
                        zoom.transformMatrix.scaleX
                      )}
                      tickFormat={(date) => {
                        if (date instanceof Date) {
                          return formatDateAxis(date);
                        }
                      }}
                      stroke={axisColor}
                      tickStroke={axisColor}
                      tickLabelProps={axisBottomTickLabelProps}
                      numTicks={width < 600 ? 5 : 10}
                    />
                  </Group>
                  <Group>
                    <AxisLeft
                      left={margin.left}
                      scale={yZoomScale(
                        zoom.transformMatrix.translateY,
                        zoom.transformMatrix.scaleY
                      )}
                      numTicks={8}
                      stroke={axisColor}
                      tickStroke={axisColor}
                      tickLabelProps={axisLeftTickLabelProps}
                    />
                  </Group>
                  {tooltipData && (
                    <Group>
                      <Line
                        from={{ x: tooltipLeft, y: margin.top }}
                        to={{ x: tooltipLeft, y: innerHeight + margin.top }}
                        stroke="#44aad6"
                        strokeWidth={1}
                        strokeDasharray="5,2"
                        pointerEvents="none"
                      />
                      <circle
                        cx={tooltipLeft}
                        cy={tooltipTop}
                        r={6}
                        fill="#fff"
                        pointerEvents="none"
                      />
                      <circle
                        cx={tooltipLeft}
                        cy={tooltipTop}
                        r={4}
                        fill="#2b6cb1"
                        pointerEvents="none"
                      />
                    </Group>
                  )}
                </>
              );
            }}
          </Zoom>
        </Group>
      </svg>
      {tooltipData && (
        <TooltipWithBounds
          key={Math.random()}
          top={tooltipTop - 12}
          left={tooltipLeft + 12}
          style={tooltipStyles}
        >
          <p
            style={{
              margin: 0,
              fontSize: '1rem',
              fontWeight: 600,
              marginBottom: '0.3rem',
            }}
          >
            {getYValue(tooltipData).toLocaleString('en', {
              style: 'currency',
              currency: 'USD',
            })}
          </p>
          <span
            style={{ fontSize: '0.75rem', color: '#ccc' }}
          >{`${formatDateTooltip(getXValue(tooltipData))}`}</span>
        </TooltipWithBounds>
      )}
    </div>
  );
};

export default AreaTest;
