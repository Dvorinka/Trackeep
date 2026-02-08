interface WeeklyBarChartProps {
  data: number[];
  title?: string;
  type?: 'activities' | 'contributions';
  fallbackData?: number[];
}

export const WeeklyBarChart = (props: WeeklyBarChartProps) => {
  const weeklyData = () => props.data || props.fallbackData || [12, 19, 8, 15, 22, 18, 25];
  const chartType = () => props.type || 'activities';

  return (
    <div class="space-y-4">
      <div class="relative h-32 md:h-36 px-6 weekly-activity-chart">
        <div class="absolute inset-x-0 inset-y-2 pointer-events-none flex flex-col justify-between">
          <div class="border-t border-border/60"></div>
          <div class="border-t border-border/40"></div>
          <div class="border-t border-border/30"></div>
          <div class="border-t border-border/20"></div>
        </div>
        <div class="relative flex items-end justify-between h-full gap-3 md:gap-4">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => {
            const activity = weeklyData()[index];
            const maxActivity = Math.max(...weeklyData());
            // Use dynamic scale based on actual data
            const fixedMax = Math.max(maxActivity, 30); // Ensure minimum scale for better visualization
            const containerHeight = 128; // h-32 = 128px (base), md:h-36 = 144px
            const availableHeight = containerHeight * 0.75; // Use 75% of container height to leave room for labels
            const heightPercent = (activity / fixedMax) * (availableHeight / containerHeight) * 100;
            const minHeightPercent = (8 / containerHeight) * 100; // Minimum 8px height
            const finalHeightPercent = Math.max(heightPercent, minHeightPercent);

            return (
              <div class="flex flex-col items-center flex-1 gap-2 group min-w-0 max-w-8">
                <div class="relative w-full max-w-4 md:max-w-5 flex flex-col items-center">
                  <span 
                    class="text-xs font-medium text-primary mb-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap absolute -top-5"
                  >
                    {activity}
                  </span>
                  <div 
                    class="w-full max-w-4 md:max-w-5 bg-primary rounded-t transition-all duration-500 hover:opacity-80 cursor-pointer hover:scale-105 weekly-bar"
                    style={`height: ${finalHeightPercent}%; background-color: hsl(199, 89%, 67%); min-height: 8px;`}
                    title={`${day}: ${activity} ${chartType()}`}
                  ></div>
                </div>
                <span class="text-xs text-muted-foreground font-medium mt-1">{day}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div class="flex justify-between text-xs text-muted-foreground pt-2 border-t border-border">
        <span>Total: {weeklyData().reduce((a, b) => a + b, 0)} {chartType()}</span>
        <span>Avg: {Math.round(weeklyData().reduce((a, b) => a + b, 0) / 7)} per day</span>
      </div>
    </div>
  );
};
