"use client";

import { useMemo } from "react";
import { format, parseISO, startOfMonth } from "date-fns";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { Receipt, TrendingUp, Users, Wallet } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { Expense, User as UserType } from "@/types";

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

interface GroupReportsTabProps {
  expenses: Expense[];
  members: UserType[];
  formatCurrency: (amount: number) => string;
}

function memberLabel(members: UserType[], userId: string): string {
  const member = members.find((m) => m.id === userId);
  return member?.name || `User ${userId.substring(0, 4)}`;
}

export function GroupReportsTab({ expenses, members, formatCurrency }: GroupReportsTabProps) {
  const reportData = useMemo(() => {
    const payerTotals: Record<string, number> = {};
    const shareTotals: Record<string, number> = {};
    const monthlyTotals: Record<string, { amount: number; month: string }> = {};

    (expenses ?? []).forEach((expense) => {
      payerTotals[expense.paidByUserId] = (payerTotals[expense.paidByUserId] || 0) + expense.amount;

      (expense.participants ?? []).forEach((p) => {
        shareTotals[p.userId] = (shareTotals[p.userId] || 0) + p.amountOwed;
      });

      if (!expense.date) return;
      const monthStart = startOfMonth(parseISO(expense.date));
      const monthKey = format(monthStart, "yyyy-MM");
      const monthLabel = format(monthStart, "MMM yy");
      if (!monthlyTotals[monthKey]) {
        monthlyTotals[monthKey] = { amount: 0, month: monthLabel };
      }
      monthlyTotals[monthKey].amount += expense.amount;
    });

    const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
    const expenseCount = expenses.length;
    const avgExpense = expenseCount > 0 ? totalSpent / expenseCount : 0;

    const spendingByPayer = Object.entries(payerTotals)
      .map(([userId, totalPaid], index) => ({
        userId,
        name: memberLabel(members, userId),
        totalPaid,
        fill: CHART_COLORS[index % CHART_COLORS.length],
        share: totalSpent > 0 ? (totalPaid / totalSpent) * 100 : 0,
      }))
      .filter((d) => d.totalPaid > 0)
      .sort((a, b) => b.totalPaid - a.totalPaid);

    const spendingByShare = Object.entries(shareTotals)
      .map(([userId, totalShare], index) => ({
        userId,
        name: memberLabel(members, userId),
        totalShare,
        fill: CHART_COLORS[index % CHART_COLORS.length],
      }))
      .filter((d) => d.totalShare > 0)
      .sort((a, b) => b.totalShare - a.totalShare);

    const spendingOverTime = Object.entries(monthlyTotals)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, data]) => ({
        month: data.month,
        amount: data.amount,
      }));

    const topPayer = spendingByPayer[0] ?? null;

    return {
      totalSpent,
      expenseCount,
      avgExpense,
      topPayer,
      spendingByPayer,
      spendingByShare,
      spendingOverTime,
    };
  }, [expenses, members]);

  const payerChartConfig = useMemo(() => {
    const config: ChartConfig = {
      totalPaid: { label: "Total paid", color: CHART_COLORS[0] },
    };
    reportData.spendingByPayer.forEach((item) => {
      config[item.name] = { label: item.name, color: item.fill };
    });
    return config;
  }, [reportData.spendingByPayer]);

  const shareChartConfig = useMemo(() => {
    const config: ChartConfig = {
      totalShare: { label: "Share consumed", color: CHART_COLORS[0] },
    };
    reportData.spendingByShare.forEach((item) => {
      config[item.name] = { label: item.name, color: item.fill };
    });
    return config;
  }, [reportData.spendingByShare]);

  const timelineChartConfig = {
    amount: { label: "Spent", color: CHART_COLORS[0] },
  } satisfies ChartConfig;

  const pieChartConfig = useMemo(() => {
    const config: ChartConfig = { share: { label: "Share" } };
    reportData.spendingByPayer.forEach((item) => {
      config[item.name] = { label: item.name, color: item.fill };
    });
    return config;
  }, [reportData.spendingByPayer]);

  const currencyTooltip = (value: number) => formatCurrency(value);

  if (expenses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reports</CardTitle>
          <CardDescription>Visual insights into group spending.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/20 py-16 text-center">
            <Receipt className="mb-3 h-10 w-10 text-muted-foreground/60" />
            <p className="font-medium">No expenses yet</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Add expenses to this group and charts will appear here automatically.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Reports</h2>
        <p className="text-sm text-muted-foreground">Visual insights into group spending.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total spent</CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(reportData.totalSpent)}</p>
            <p className="text-xs text-muted-foreground">Across all group expenses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Expenses</CardTitle>
            <Receipt className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{reportData.expenseCount}</p>
            <p className="text-xs text-muted-foreground">
              Avg {formatCurrency(reportData.avgExpense)} each
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Top payer</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="truncate text-lg font-bold">
              {reportData.topPayer?.name ?? "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              {reportData.topPayer
                ? `${formatCurrency(reportData.topPayer.totalPaid)} paid (${reportData.topPayer.share.toFixed(0)}%)`
                : "No payments recorded"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active spenders</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{reportData.spendingByPayer.length}</p>
            <p className="text-xs text-muted-foreground">Members who paid expenses</p>
          </CardContent>
        </Card>
      </div>

      {reportData.spendingOverTime.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Spending over time</CardTitle>
            <CardDescription>Monthly total of all group expenses.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={timelineChartConfig} className="h-[280px] w-full">
              <AreaChart data={reportData.spendingOverTime} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={24}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  width={72}
                  tickFormatter={(v) => formatCurrency(v)}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => currencyTooltip(Number(value))}
                    />
                  }
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="hsl(var(--chart-1))"
                  strokeWidth={2}
                  fill="url(#spendGradient)"
                  dot={{ r: 3, fill: "hsl(var(--chart-1))" }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Who paid the most</CardTitle>
            <CardDescription>Total amount each member fronted for the group.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={payerChartConfig} className="h-[min(360px,50vh)] w-full">
              <BarChart
                data={reportData.spendingByPayer}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
              >
                <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => formatCurrency(v)}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  width={88}
                  tick={{ fontSize: 12 }}
                />
                <ChartTooltip
                  cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                  content={
                    <ChartTooltipContent
                      hideLabel
                      formatter={(value, _name, item) => {
                        const share = (item.payload as { share?: number }).share;
                        return (
                          <span className="font-mono font-medium">
                            {formatCurrency(Number(value))}
                            {share != null ? ` (${share.toFixed(1)}%)` : ""}
                          </span>
                        );
                      }}
                    />
                  }
                />
                <Bar dataKey="totalPaid" radius={[0, 6, 6, 0]} maxBarSize={32}>
                  {reportData.spendingByPayer.map((entry) => (
                    <Cell key={entry.userId} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Share of payments</CardTitle>
            <CardDescription>How group spending is split among payers.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={pieChartConfig} className="mx-auto h-[min(360px,50vh)] w-full max-w-sm">
              <PieChart>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      hideLabel
                      formatter={(value, name) => (
                        <span className="font-mono font-medium">
                          {formatCurrency(Number(value))} · {name}
                        </span>
                      )}
                    />
                  }
                />
                <Pie
                  data={reportData.spendingByPayer}
                  dataKey="totalPaid"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  strokeWidth={2}
                  stroke="hsl(var(--background))"
                >
                  {reportData.spendingByPayer.map((entry) => (
                    <Cell key={entry.userId} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <ul className="mt-4 space-y-2">
              {reportData.spendingByPayer.map((item) => (
                <li key={item.userId} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 truncate">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: item.fill }}
                    />
                    {item.name}
                  </span>
                  <span className="shrink-0 font-medium tabular-nums">
                    {item.share.toFixed(0)}% · {formatCurrency(item.totalPaid)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {reportData.spendingByShare.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Who consumed the most</CardTitle>
            <CardDescription>Total share each member owes across all expense splits.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={shareChartConfig} className="h-[min(320px,45vh)] w-full">
              <BarChart data={reportData.spendingByShare} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  interval={0}
                  angle={reportData.spendingByShare.length > 5 ? -25 : 0}
                  textAnchor={reportData.spendingByShare.length > 5 ? "end" : "middle"}
                  height={reportData.spendingByShare.length > 5 ? 56 : 32}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  width={72}
                  tickFormatter={(v) => formatCurrency(v)}
                />
                <ChartTooltip
                  cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                  content={
                    <ChartTooltipContent
                      formatter={(value) => currencyTooltip(Number(value))}
                    />
                  }
                />
                <Bar dataKey="totalShare" radius={[6, 6, 0, 0]} maxBarSize={48}>
                  {reportData.spendingByShare.map((entry) => (
                    <Cell key={entry.userId} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
