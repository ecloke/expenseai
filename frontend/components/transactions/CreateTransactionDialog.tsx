'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
}

interface CreateTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTransactionCreated: () => void;
  userId: string;
}

type TransactionType = 'income' | 'expense';

interface TransactionData {
  type: TransactionType;
  receipt_date: string;
  store_name: string;
  description: string;
  category_id: string;
  total_amount: string;
}

export function CreateTransactionDialog({ 
  open, 
  onOpenChange, 
  onTransactionCreated, 
  userId 
}: CreateTransactionDialogProps) {
  const [transactionType, setTransactionType] = useState<TransactionType>('expense');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState<TransactionData>({
    type: 'expense',
    receipt_date: new Date().toISOString().split('T')[0], // Today's date
    store_name: '',
    description: '',
    category_id: '',
    total_amount: ''
  });

  // Load categories when dialog opens or transaction type changes
  useEffect(() => {
    if (open) {
      loadCategories(transactionType);
    }
  }, [open, transactionType]);

  // Update form data when transaction type changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      type: transactionType,
      category_id: '', // Reset category selection
      store_name: transactionType === 'income' ? '' : prev.store_name,
      description: transactionType === 'expense' ? '' : prev.description
    }));
  }, [transactionType]);

  const loadCategories = async (type: TransactionType) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/categories?user_id=${userId}&type=${type}`);
      if (!response.ok) throw new Error('Failed to load categories');
      
      const result = await response.json();
      if (result.success) {
        setCategories(result.data);
      } else {
        throw new Error(result.message || 'Failed to load categories');
      }
    } catch (err) {
      console.error('Error loading categories:', err);
      setError(`Failed to load ${type} categories. Please try again.`);
    }
  };

  const handleInputChange = (field: keyof TransactionData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(''); // Clear error when user starts typing
  };

  const validateForm = (): string | null => {
    if (!formData.receipt_date) return 'Date is required';
    if (!formData.category_id) return 'Category is required';
    if (!formData.total_amount || parseFloat(formData.total_amount) <= 0) {
      return 'Amount must be greater than 0';
    }

    if (transactionType === 'expense') {
      if (!formData.store_name.trim()) return 'Store name is required for expenses';
    } else {
      if (!formData.description.trim()) return 'Description is required for income';
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Find the category name from the selected category ID
      const selectedCategory = categories.find(cat => cat.id === formData.category_id);
      if (!selectedCategory) {
        setError('Invalid category selected');
        return;
      }

      const payload = {
        user_id: userId,
        type: formData.type,
        receipt_date: formData.receipt_date,
        category: selectedCategory.name, // Send category NAME, not ID
        category_id: formData.category_id, // Also send ID for backend reference
        total_amount: parseFloat(formData.total_amount),
        ...(transactionType === 'expense' 
          ? { store_name: formData.store_name.trim() }
          : { 
              store_name: formData.description.trim(), // Use description as store_name for income
              description: formData.description.trim() 
            }
        )
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorResult = await response.json();
        throw new Error(errorResult.message || 'Failed to create transaction');
      }

      const result = await response.json();
      if (result.success) {
        // Reset form
        setFormData({
          type: 'expense',
          receipt_date: new Date().toISOString().split('T')[0],
          store_name: '',
          description: '',
          category_id: '',
          total_amount: ''
        });
        
        onTransactionCreated();
        onOpenChange(false);
      } else {
        throw new Error(result.message || 'Failed to create transaction');
      }
    } catch (err) {
      console.error('Error creating transaction:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      type: 'expense',
      receipt_date: new Date().toISOString().split('T')[0],
      store_name: '',
      description: '',
      category_id: '',
      total_amount: ''
    });
    setError('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-gray-800 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Add Transaction
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Transaction Type Tabs */}
          <Tabs value={transactionType} onValueChange={(value) => setTransactionType(value as TransactionType)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="expense" className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                Expense
              </TabsTrigger>
              <TabsTrigger value="income" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Income
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="bg-red-900/50 border-red-800 text-red-200">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-200">{error}</AlertDescription>
            </Alert>
          )}

          {/* Date Field */}
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={formData.receipt_date}
              onChange={(e) => handleInputChange('receipt_date', e.target.value)}
              className="bg-gray-700 border-gray-600 text-white [color-scheme:dark]"
              required
              autoFocus={false}
            />
          </div>

          {/* Dynamic Field based on Transaction Type */}
          {transactionType === 'expense' ? (
            <div className="space-y-2">
              <Label htmlFor="store">Store Name</Label>
              <Input
                id="store"
                placeholder="e.g., Walmart, Starbucks, Target..."
                value={formData.store_name}
                onChange={(e) => handleInputChange('store_name', e.target.value)}
                className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                required
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="e.g., Monthly salary, Freelance payment..."
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                required
              />
            </div>
          )}

          {/* Category Selection */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={formData.category_id} onValueChange={(value) => handleInputChange('category_id', value)}>
              <SelectTrigger>
                <SelectValue placeholder={`Select ${transactionType} category`} />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount Field */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={formData.total_amount}
                onChange={(e) => handleInputChange('total_amount', e.target.value)}
                className="pl-10 bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                required
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={handleCancel} disabled={loading}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className={transactionType === 'income' ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              {loading ? 'Creating...' : `Add ${transactionType === 'income' ? 'Income' : 'Expense'}`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}