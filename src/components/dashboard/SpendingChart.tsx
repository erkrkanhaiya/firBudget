"use client";

import { TrendingUp } from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";


// Placeholder Data - Replace with actual data aggregation
const data = [
  { category: 'Food', total: Math.floor(Math.random() * 500) + 100 },
  { category: 'Housing', total: Math.floor(Math.random() * 1000) + 500 },
  { category: 'Transport', total: Math.floor(Math.random() * 300) + 50 },
  { category: 'Shopping', total: Math.floor(Math.random() * 400) + 80 },
  { category: 'Health', total: Math.floor(Math.random() * 200) + 30 },
  { category: 'Entertainment', total: Math.floor(Math.random() * 250) + 70 },
];

const chartConfig = {
  total: {
    label: "Total Spent",
    color: "hsl(var(--chart-1))", // Use theme color
  },
};

export default function SpendingChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Spending by Category (This Month)</CardTitle>
        <CardDescription>Visual breakdown of your expenses.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                 <XAxis
                    dataKey="category"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `$${value}`}
                  />
                   <Tooltip
                    cursor={{ fill: "hsl(var(--accent))", opacity: 0.3 }} // Use accent color for cursor with opacity
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} /> {/* Use primary theme color */}
                </BarChart>
            </ResponsiveContainer>
         </ChartContainer>
      </CardContent>
    </Card>
  );
}
