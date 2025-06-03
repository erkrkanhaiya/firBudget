
'use server';
/**
 * @fileOverview An AI flow to categorize expenses based on their description.
 *
 * - categorizeExpense - A function that suggests a category for an expense.
 * - CategorizeExpenseInput - The input type for the categorizeExpense function.
 * - CategorizeExpenseOutput - The return type for the categorizeExpense function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { ExpenseCategory } from '@/types';

const predefinedCategories: ExpenseCategory[] = ["Food", "Travel", "Utilities", "Entertainment", "Shopping", "Other"];

export const CategorizeExpenseInputSchema = z.object({
  description: z.string().describe('The description of the expense.'),
});
export type CategorizeExpenseInput = z.infer<typeof CategorizeExpenseInputSchema>;

export const CategorizeExpenseOutputSchema = z.object({
  category: z.string().describe(`Suggested category for the expense. Should be one of: ${predefinedCategories.join(", ")}. If none match well, suggest "Other".`),
});
export type CategorizeExpenseOutput = z.infer<typeof CategorizeExpenseOutputSchema>;

export async function categorizeExpense(input: CategorizeExpenseInput): Promise<CategorizeExpenseOutput> {
  return categorizeExpenseGenkitFlow(input);
}

const prompt = ai.definePrompt({
  name: 'categorizeExpensePrompt',
  input: { schema: CategorizeExpenseInputSchema },
  output: { schema: CategorizeExpenseOutputSchema },
  prompt: `You are an assistant that helps categorize expenses.
Based on the expense description, suggest the most relevant category from the following list:
${predefinedCategories.join(", ")}.

If the description doesn't clearly fit into one of these categories, suggest "Other".
Provide only the category name as your output.

Expense Description: {{{description}}}
`,
});

const categorizeExpenseGenkitFlow = ai.defineFlow(
  {
    name: 'categorizeExpenseFlow',
    inputSchema: CategorizeExpenseInputSchema,
    outputSchema: CategorizeExpenseOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
        // Fallback or error handling if LLM returns nothing
        return { category: "Other" };
    }
    // Ensure the output category is one of the predefined ones or "Other"
    const suggestedCategory = output.category;
    if (predefinedCategories.includes(suggestedCategory as ExpenseCategory)) {
        return { category: suggestedCategory };
    }
    return { category: "Other" };
  }
);
