import { useColorModeValue } from "@chakra-ui/react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Label } from "recharts";

/**
 * Score-distribution histogram for the assignment-data Statistics tab.
 *
 * Extracted from AssignmentResponseOverview so its colors can be made
 * color-mode aware (and tested in both modes). Recharts axes/grid/labels
 * otherwise fall back to library-default grays (~#666 text, #ccc grid) that
 * don't respond to the color mode, so on the dark page the axis text and labels
 * render as dim, sub-AA gray. Drive them from the same values as the `textMuted`
 * and `border` semantic tokens instead.
 */
export function ScoreSummaryChart({
  data,
}: {
  data: { score: number; count: number }[];
}) {
  // Match the textMuted / border semantic tokens (theme.ts). Both pass contrast
  // for axis text in their mode; the grid is decorative.
  const axisColor = useColorModeValue("#4a5568", "#a6adba");
  const gridColor = useColorModeValue("#e0e0e0", "#3c414d");

  return (
    <BarChart
      width={600}
      height={300}
      data={data}
      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
    >
      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
      <XAxis dataKey="score" stroke={axisColor} tick={{ fill: axisColor }}>
        <Label
          value="Score"
          offset={0}
          position="insideBottom"
          fill={axisColor}
        />
      </XAxis>
      <YAxis stroke={axisColor} tick={{ fill: axisColor }}>
        <Label
          value="Number of students"
          angle={-90}
          position="insideLeft"
          fill={axisColor}
        />
      </YAxis>
      <Bar dataKey="count" fill="#8884d8" />
    </BarChart>
  );
}
