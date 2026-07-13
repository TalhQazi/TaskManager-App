import React, { useMemo } from "react";
import { View, Text, StyleSheet, Platform, Dimensions } from "react-native";
import Svg, { Rect, Path, G, Line, Defs, LinearGradient, Stop } from "react-native-svg";
import { useAtlasBooks } from "../context/AtlasBooksContext";

interface HighContrastChartProps {
  type?: "area" | "bar";
  metricType?: "revenue" | "expenses" | "netProfit" | "cash";
  height?: number;
}

export const HighContrastChart: React.FC<HighContrastChartProps> = ({
  type = "area",
  metricType = "revenue",
  height = 220
}) => {
  const { activeEntity, timeframe } = useAtlasBooks();
  const screenWidth = Dimensions.get("window").width - 64; // Grid padding tracking math

  const chartData = useMemo(() => {
    const seed = (activeEntity?.id || "default").split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const length = timeframe === "Daily" ? 7 : timeframe === "Monthly" ? 12 : timeframe === "Quarterly" ? 4 : 5;

    const labels: string[] = [];
    if (timeframe === "Daily") {
      labels.push("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun");
    } else if (timeframe === "Monthly") {
      labels.push("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec");
    } else if (timeframe === "Quarterly") {
      labels.push("Q1", "Q2", "Q3", "Q4");
    } else {
      labels.push("2022", "2023", "2024", "2025", "2026");
    }

    let base = 500000;
    if (activeEntity?.level === "holding") base = 3500000;
    else if (activeEntity?.level === "company") base = 1800000;
    else if (activeEntity?.level === "location") base = 900000;
    else if (activeEntity?.level === "department") base = 300000;

    return Array.from({ length }).map((_, index) => {
      const step = Math.sin(index + seed) * 0.15 + 1.0;
      const noise = Math.cos(index * 2.3 + seed) * 0.08 + 1.0;
      
      const rev = Math.round(base * step * noise * (1 + index * 0.03));
      const exp = Math.round(rev * (0.55 + Math.sin(index * 1.5) * 0.05));
      const profit = rev - exp;
      const cash = Math.round(base * 3.5 + index * base * 0.2);

      return {
        name: labels[index] || `${index + 1}`,
        Value: metricType === "expenses" ? exp : metricType === "netProfit" ? profit : metricType === "cash" ? cash : rev
      };
    });
  }, [activeEntity, timeframe, metricType]);

  // Geometric layout scales
  const paddingLeft = 36;
  const paddingRight = 10;
  const paddingTop = 15;
  const paddingBottom = 25;
  const chartWidth = screenWidth - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Compute boundaries for drawing
  const values = chartData.map(d => d.Value);
  const maxValue = Math.max(...values, 1000) * 1.15; 
  const minValue = 0;
  const valueRange = maxValue - minValue;

  const formatYAxis = (val: number) => {
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `$${(val / 1000).toFixed(0)}K`;
    return `$${val}`;
  };

  // Grid coordinates mapping
  const points = chartData.map((d, i) => {
    const x = paddingLeft + (i / (chartData.length - 1)) * chartWidth;
    const y = paddingTop + chartHeight - ((d.Value - minValue) / valueRange) * chartHeight;
    return { x, y, label: d.name, val: d.Value };
  });

  // SVG Render Path Generation for Area Layouts
  const linePath = points.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), "");
  const areaPath = points.length > 0 ? `${linePath} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z` : "";

  return (
    <View style={{ height }}>
      <Svg width={screenWidth} height={height}>
        <Defs>
          <LinearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#D4AF37" stopOpacity="0.25" />
            <Stop offset="100%" stopColor="#D4AF37" stopOpacity="0.0" />
          </LinearGradient>
        </Defs>

        {/* Horizontal Background Grids */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
          const yCoord = paddingTop + chartHeight * ratio;
          const currentVal = maxValue - (valueRange * ratio);
          return (
            <G key={`grid-${index}`}>
              <Line 
                x1={paddingLeft} 
                y1={yCoord} 
                x2={screenWidth - paddingRight} 
                y2={yCoord} 
                stroke="#1f1f23" 
                strokeWidth={1} 
                strokeDasharray="3,3" 
              />
              {/* Left Side Labels */}
              <Text 
                style={[styles.axisLabel, { position: 'absolute', left: 0, top: yCoord - 6 }]}
                nativeID={`y-label-${index}`}
              >
                {formatYAxis(currentVal)}
              </Text>
            </G>
          );
        })}

        {/* Dynamic Vector Rendering Context */}
        {type === "area" && points.length > 0 && (
          <G>
            <Path d={areaPath} fill="url(#goldGradient)" />
            <Path d={linePath} fill="none" stroke="#D4AF37" strokeWidth={2} />
          </G>
        )}

        {type === "bar" && points.map((p, i) => {
          const barWidth = Math.min((chartWidth / chartData.length) * 0.6, 45);
          const barHeight = paddingTop + chartHeight - p.y;
          const barX = paddingLeft + (i / (chartData.length - 1)) * chartWidth - barWidth / 2;
          
          // Fallback parsing alignment for bounds boundary anomalies
          const safeBarX = chartData.length === 1 ? paddingLeft + chartWidth / 2 - barWidth / 2 : barX;

          return (
            <Rect
              key={`bar-${i}`}
              x={safeBarX}
              y={p.y}
              width={barWidth}
              height={Math.max(barHeight, 2)}
              fill="#D4AF37"
              rx={4}
            />
          );
        })}

        {/* X-Axis Horizontal Period Nodes */}
        {points.map((p, i) => {
          const xPos = paddingLeft + (i / (chartData.length - 1)) * chartWidth;
          const safeX = chartData.length === 1 ? paddingLeft + chartWidth / 2 : xPos;
          return (
            <G key={`x-axis-${i}`}>
              <Line
                x1={safeX}
                y1={paddingTop + chartHeight}
                x2={safeX}
                y2={paddingTop + chartHeight + 4}
                stroke="#52525b"
                strokeWidth={1}
              />
              {/* Center aligned labels manually calculated */}
              <Text
                style={[
                  styles.axisLabel, 
                  { 
                    position: 'absolute', 
                    left: safeX - 12, 
                    top: paddingTop + chartHeight + 8,
                    textAlign: 'center',
                    width: 24
                  }
                ]}
              >
                {p.label}
              </Text>
            </G>
          );
        })}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  axisLabel: {
    fontSize: 9,
    color: "#52525b",
    fontFamily: Platform.select({ ios: "Courier New", android: "monospace" })
  }
});