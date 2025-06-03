
'use server';
/**
 * @fileOverview An AI flow to extract expense details from a receipt image and suggest a category.
 *
 * - extractExpenseDetails - A function that extracts amount, description, date, and suggests a category for an expense.
 * - ExtractExpenseDetailsInput - The input type for the extractExpenseDetails function (imported from @/types).
 * - ExtractExpenseDetailsOutput - The return type for the extractExpenseDetails function (imported from @/types).
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { 
  PREDEFINED_EXPENSE_CATEGORIES, 
  type ExpenseCategory,
  ExtractExpenseDetailsInputSchema, // Import schema
  type ExtractExpenseDetailsInput,    // Import type
  ExtractExpenseDetailsOutputSchema, // Import schema
  type ExtractExpenseDetailsOutput   // Import type
} from '@/types';

export async function extractExpenseDetails(input: ExtractExpenseDetailsInput): Promise<ExtractExpenseDetailsOutput> {
  return extractExpenseDetailsGenkitFlow(input);
}

const systemPromptBase = `You are an intelligent assistant that helps users by extracting key information from expense receipts and suggesting categories.
The predefined categories are: ${PREDEFINED_EXPENSE_CATEGORIES.join(", ")}.
If a clear category match isn't found, suggest "Other".
If you cannot confidently extract a piece of information (amount, date, description), omit that field or return it as undefined/null rather than guessing wildly.
For the date, try to format it as YYYY-MM-DD if possible.
For the amount, ensure it's a numeric value.
For the description, provide a concise business name or a summary of the items/service if the business name is not clear.`;

const imageAnalysisPrompt = ai.definePrompt({
  name: 'extractExpenseDetailsFromImagePrompt',
  input: { schema: ExtractExpenseDetailsInputSchema },
  output: { schema: ExtractExpenseDetailsOutputSchema },
  prompt: `${systemPromptBase}

Analyze the following receipt image:
{{media url=receiptDataUri}}

Based *only* on the image, extract the following:
1.  Total Amount Paid
2.  Vendor/Store Name (or a short description of items purchased if vendor is unclear)
3.  Transaction Date

Then, suggest the most relevant category from the predefined list for this expense.
{{#if userDescription}}
The user also provided this description: "{{userDescription}}". Use this as a strong hint for categorization and for the description if the image is ambiguous for the vendor name.
{{/if}}
`,
});

const textCategorizationPrompt = ai.definePrompt({
  name: 'categorizeExpenseFromTextPrompt',
  input: { schema: z.object({ userDescription: z.string() }) },
  output: { schema: z.object({ suggestedCategory: z.string().optional() }) },
  prompt: `You are an assistant that helps categorize expenses.
Based on the expense description, suggest the most relevant category from the following list:
${PREDEFINED_EXPENSE_CATEGORIES.join(", ")}.

If the description doesn't clearly fit into one of these categories, suggest "Other".
Provide only the category name as your output.

Expense Description: {{{userDescription}}}
`,
});


const extractExpenseDetailsGenkitFlow = ai.defineFlow(
  {
    name: 'extractExpenseDetailsFlow',
    inputSchema: ExtractExpenseDetailsInputSchema,
    outputSchema: ExtractExpenseDetailsOutputSchema,
  },
  async (input) => {
    if (input.receiptDataUri) {
      // Prefer image analysis if receipt is provided
      const { output } = await imageAnalysisPrompt(input);
      if (!output) {
        // Fallback or error handling if LLM returns nothing from image
        return { suggestedCategory: "Other" };
      }
      // Validate or clean output if necessary
      const cleanedOutput: ExtractExpenseDetailsOutput = { ...output };
      if (cleanedOutput.extractedAmount && isNaN(Number(cleanedOutput.extractedAmount))) {
        cleanedOutput.extractedAmount = undefined; // Clear if not a valid number
      } else if (cleanedOutput.extractedAmount) {
        cleanedOutput.extractedAmount = Number(parseFloat(String(cleanedOutput.extractedAmount)).toFixed(2));
      }

      if (cleanedOutput.suggestedCategory && !PREDEFINED_EXPENSE_CATEGORIES.includes(cleanedOutput.suggestedCategory as ExpenseCategory)) {
        cleanedOutput.suggestedCategory = "Other";
      }
       if (!cleanedOutput.suggestedCategory && input.userDescription) {
         const { output: textCatOutput } = await textCategorizationPrompt({ userDescription: input.userDescription });
         cleanedOutput.suggestedCategory = textCatOutput?.suggestedCategory || "Other";
       } else if (!cleanedOutput.suggestedCategory) {
            cleanedOutput.suggestedCategory = "Other";
       }

      return cleanedOutput;
    } else if (input.userDescription) {
      // Fallback to text-based categorization if only description is available
      const { output } = await textCategorizationPrompt({ userDescription: input.userDescription });
      if (!output) {
        return { suggestedCategory: "Other" };
      }
      return { suggestedCategory: PREDEFINED_EXPENSE_CATEGORIES.includes(output.suggestedCategory as ExpenseCategory) ? output.suggestedCategory : "Other" };
    }
    // If no input is provided that can be processed
    return { suggestedCategory: "Other" };
  }
);
