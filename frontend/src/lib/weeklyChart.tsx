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
      <div class="relative h-32 md:h-36 px-2 sm:px-4 lg:px-6 weekly-activity-chart">
        {/* Grid lines */}
        <div class="absolute inset-x-0 inset-y-2 pointer-events-none flex flex-col justify-between">
          <div class="border-t border-border/60"></div>
          <div class="border-t border-border/40"></div>
          <div class="border-t border-border/30"></div>
          <div class="border-t border-border/20"></div>
        </div>
        
        {/* Bars container */}
        <div class="relative flex items-end justify-between h-full w-full">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => {
            const activity = weeklyData()[index];
            const maxActivity = Math.max(...weeklyData());
            const minActivity = Math.min(...weeklyData());
            
            // Calculate responsive height with proper scaling
            let heightPercent;
            if (maxActivity === minActivity) {
              // All values are the same, use 80% height for consistency
              heightPercent = 80;
            } else {
              // Use the actual range for proportional scaling
              const range = maxActivity - minActivity;
              const normalizedValue = activity - minActivity;
              // Scale to 20-90% range to ensure visibility while maintaining proportions
              heightPercent = 20 + (normalizedValue / range) * 70;
            }
            
            // Ensure minimum height for very small values but maintain proportion
            const finalHeightPercent = Math.max(heightPercent, 8);

            return (
              <div class="flex flex-col items-center flex-1 gap-2 group min-w-0 max-w-4 h-full">
                <div class="relative w-full max-w-2 md:max-w-3 flex flex-col items-center justify-end h-full">
                  <span class="text-xs font-medium text-primary mb-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap absolute -top-5 z-10">{activity}</span>
                  <div 
                    class="w-full max-w-2 md:max-w-3 bg-primary rounded-t transition-all duration-500 hover:opacity-80 cursor-pointer hover:scale-105 weekly-bar" 
                    style={`height: ${finalHeightPercent}%; background-color: rgb(96, 198, 246); min-height: 4px;`}
                    title={`${day}: ${activity} ${chartType()}`}
                  ></div>
                </div>
                <span class="text-xs text-muted-foreground font-medium mt-1">{day}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div class="flex justify-between text-xs text-muted-foreground pt-2 border-t border-border px-2 sm:px-4 lg:px-6">
        <span>Total: {weeklyData().reduce((a, b) => a + b, 0)} {chartType()}</span>
        <span>Avg: {Math.round(weeklyData().reduce((a, b) => a + b, 0) / 7)} per day</span>
      </div>
    </div>
  );
};
