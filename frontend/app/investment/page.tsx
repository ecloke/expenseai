'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calculator, TrendingUp, BarChart3 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface InvestmentResult {
  year: number;
  startingBalance: number;
  monthlyContributions: number;
  interestEarned: number;
  endingBalance: number;
}

export default function InvestmentCalculator() {
  const [inputs, setInputs] = useState({
    targetAmount: '',
    startingAmount: '',
    years: '',
    returnRate: ''
  });

  const [monthlyContribution, setMonthlyContribution] = useState<number | null>(null);
  const [yearlyBreakdown, setYearlyBreakdown] = useState<InvestmentResult[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateInputs = () => {
    const newErrors: Record<string, string> = {};

    if (!inputs.targetAmount || parseFloat(inputs.targetAmount) <= 0) {
      newErrors.targetAmount = 'Target amount must be greater than 0';
    }

    if (!inputs.startingAmount || parseFloat(inputs.startingAmount) < 0) {
      newErrors.startingAmount = 'Starting amount cannot be negative';
    }

    if (!inputs.years || parseInt(inputs.years) <= 0) {
      newErrors.years = 'Years must be greater than 0';
    }

    if (!inputs.returnRate || parseFloat(inputs.returnRate) < 0) {
      newErrors.returnRate = 'Return rate cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const calculateInvestment = () => {
    if (!validateInputs()) return;

    const targetAmount = parseFloat(inputs.targetAmount);
    const startingAmount = parseFloat(inputs.startingAmount);
    const years = parseInt(inputs.years);
    const annualReturnRate = parseFloat(inputs.returnRate) / 100;

    // Calculate required monthly contribution using compound interest formula
    // A = P(1 + r)^t + PMT * [((1 + r)^t - 1) / r]
    // Solving for PMT (monthly contribution)
    
    const futureValueOfStartingAmount = startingAmount * Math.pow(1 + annualReturnRate, years);
    const remainingAmount = targetAmount - futureValueOfStartingAmount;
    
    let requiredMonthlyContribution = 0;
    if (remainingAmount > 0 && annualReturnRate > 0) {
      const monthlyRate = annualReturnRate / 12;
      const months = years * 12;
      const annuityFactor = (Math.pow(1 + monthlyRate, months) - 1) / monthlyRate;
      requiredMonthlyContribution = remainingAmount / annuityFactor;
    } else if (remainingAmount > 0 && annualReturnRate === 0) {
      // If no return rate, simple division
      requiredMonthlyContribution = remainingAmount / (years * 12);
    }

    setMonthlyContribution(requiredMonthlyContribution);

    // Generate yearly breakdown
    const breakdown: InvestmentResult[] = [];
    let currentBalance = startingAmount;

    for (let year = 1; year <= years; year++) {
      const startingBalance = currentBalance;
      const monthlyContrib = requiredMonthlyContribution * 12;
      const interestEarned = currentBalance * annualReturnRate;
      const endingBalance = startingBalance + monthlyContrib + interestEarned;

      breakdown.push({
        year,
        startingBalance,
        monthlyContributions: monthlyContrib,
        interestEarned,
        endingBalance
      });

      currentBalance = endingBalance;
    }

    setYearlyBreakdown(breakdown);
  };

  const handleInputChange = (field: string, value: string) => {
    setInputs(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center justify-center gap-3">
            <Calculator className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            Investment Calculator
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Calculate how much you need to invest monthly to reach your financial goals
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Form */}
          <Card>
            <CardHeader>
              <CardTitle>Investment Parameters</CardTitle>
              <CardDescription>
                Enter your financial goals and timeline
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="targetAmount">Target Amount ($)</Label>
                <Input
                  id="targetAmount"
                  type="number"
                  placeholder="100000"
                  value={inputs.targetAmount}
                  onChange={(e) => handleInputChange('targetAmount', e.target.value)}
                  className={errors.targetAmount ? 'border-red-500' : ''}
                />
                {errors.targetAmount && (
                  <p className="text-red-500 text-sm mt-1">{errors.targetAmount}</p>
                )}
              </div>

              <div>
                <Label htmlFor="startingAmount">Starting Amount ($)</Label>
                <Input
                  id="startingAmount"
                  type="number"
                  placeholder="5000"
                  value={inputs.startingAmount}
                  onChange={(e) => handleInputChange('startingAmount', e.target.value)}
                  className={errors.startingAmount ? 'border-red-500' : ''}
                />
                {errors.startingAmount && (
                  <p className="text-red-500 text-sm mt-1">{errors.startingAmount}</p>
                )}
              </div>

              <div>
                <Label htmlFor="years">Time Period (Years)</Label>
                <Input
                  id="years"
                  type="number"
                  placeholder="10"
                  value={inputs.years}
                  onChange={(e) => handleInputChange('years', e.target.value)}
                  className={errors.years ? 'border-red-500' : ''}
                />
                {errors.years && (
                  <p className="text-red-500 text-sm mt-1">{errors.years}</p>
                )}
              </div>

              <div>
                <Label htmlFor="returnRate">Expected Annual Return Rate (%)</Label>
                <Input
                  id="returnRate"
                  type="number"
                  step="0.1"
                  placeholder="7.0"
                  value={inputs.returnRate}
                  onChange={(e) => handleInputChange('returnRate', e.target.value)}
                  className={errors.returnRate ? 'border-red-500' : ''}
                />
                {errors.returnRate && (
                  <p className="text-red-500 text-sm mt-1">{errors.returnRate}</p>
                )}
              </div>

              <Button 
                onClick={calculateInvestment} 
                className="w-full"
                size="lg"
              >
                <Calculator className="h-4 w-4 mr-2" />
                Calculate Investment
              </Button>
            </CardContent>
          </Card>

          {/* Results */}
          {monthlyContribution !== null && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                  Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg mb-4">
                  <p className="text-sm text-green-700 dark:text-green-300 mb-1">
                    Required Monthly Contribution
                  </p>
                  <p className="text-2xl font-bold text-green-800 dark:text-green-200">
                    {formatCurrency(monthlyContribution)}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Total Contributions</p>
                    <p className="font-semibold">
                      {formatCurrency(monthlyContribution * parseInt(inputs.years) * 12 + parseFloat(inputs.startingAmount))}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Total Interest Earned</p>
                    <p className="font-semibold text-green-600 dark:text-green-400">
                      {yearlyBreakdown.length > 0 && 
                        formatCurrency(parseFloat(inputs.targetAmount) - (monthlyContribution * parseInt(inputs.years) * 12 + parseFloat(inputs.startingAmount)))
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Investment Growth Chart */}
        {yearlyBreakdown.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                Investment Growth Over Time
              </CardTitle>
              <CardDescription>
                Visualize how your investment will grow year by year
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={yearlyBreakdown}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-300 dark:stroke-gray-600" />
                    <XAxis 
                      dataKey="year" 
                      className="text-gray-600 dark:text-gray-400"
                    />
                    <YAxis 
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                      className="text-gray-600 dark:text-gray-400"
                    />
                    <Tooltip 
                      formatter={(value, name) => [formatCurrency(Number(value)), name]}
                      labelFormatter={(label) => `Year ${label}`}
                      contentStyle={{
                        backgroundColor: 'var(--background)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="endingBalance" 
                      stroke="#3b82f6" 
                      strokeWidth={3}
                      dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                      name="Account Balance"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="startingBalance" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
                      name="Starting Balance"
                      strokeDasharray="5 5"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Yearly Breakdown Table */}
        {yearlyBreakdown.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Yearly Breakdown</CardTitle>
              <CardDescription>
                Detailed year-by-year growth of your investment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Year</TableHead>
                      <TableHead>Starting Balance</TableHead>
                      <TableHead>Annual Contributions</TableHead>
                      <TableHead>Interest Earned</TableHead>
                      <TableHead>Ending Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {yearlyBreakdown.map((row) => (
                      <TableRow key={row.year}>
                        <TableCell className="font-medium">{row.year}</TableCell>
                        <TableCell>{formatCurrency(row.startingBalance)}</TableCell>
                        <TableCell>{formatCurrency(row.monthlyContributions)}</TableCell>
                        <TableCell className="text-green-600 dark:text-green-400">
                          {formatCurrency(row.interestEarned)}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(row.endingBalance)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}