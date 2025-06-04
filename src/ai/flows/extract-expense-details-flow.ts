
'use server';
/**
 * @fileOverview An AI flow to extract expense details from a receipt image.
 *
 * - extractExpenseDetails - A function that extracts amount, description, and date for an expense.
 * - ExtractExpenseDetailsInput - The input type for the extractExpenseDetails function (imported from @/types).
 * - ExtractExpenseDetailsOutput - The return type for the extractExpenseDetails function (imported from @/types).
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { 
  ExtractExpenseDetailsInputSchema, // Import schema
  type ExtractExpenseDetailsInput,    // Import type
  ExtractExpenseDetailsOutputSchema, // Import schema
  type ExtractExpenseDetailsOutput   // Import type
} from '@/types';

export async function extractExpenseDetails(input: ExtractExpenseDetailsInput): Promise<ExtractExpenseDetailsOutput> {
  return extractExpenseDetailsGenkitFlow(input);
}

const systemPromptBase = `You are an intelligent assistant that helps users by extracting key information from expense receipts.
If you cannot confidently extract a piece of information (amount, date, description), omit that field or return it as undefined/null rather than guessing wildly.
For the date, try to format it as YYYY-MM-DD if possible.
For the amount, ensure it's a numeric value.
For the description, provide a concise business name or a summary of the items/service if the business name is not clear.`;

const imageAnalysisPrompt = ai.definePrompt({
  name: 'extractExpenseDetailsFromImagePrompt',
  input: { schema: ExtractExpenseDetailsInputSchema },
  output: { schema: ExtractExpenseDetailsOutputSchema }, // Output schema no longer includes suggestedCategory
  prompt: `${systemPromptBase}

Analyze the following receipt image:
{{media url=receiptDataUri}}

Based *only* on the image, extract the following:
1.  Total Amount Paid
2.  Vendor/Store Name (or a short description of items purchased if vendor is unclear)
3.  Transaction Date

{{#if userDescription}}
The user also provided this description: "{{userDescription}}". Use this as a hint for the description if the image is ambiguous for the vendor name.
{{/if}}
`,
});

// Text categorization prompt is no longer needed if category isn't being extracted for the form
// const textCategorizationPrompt = ai.definePrompt({
//   name: 'categorizeExpenseFromTextPrompt',
//   input: { schema: z.object({ userDescription: z.string() }) },
//   output: { schema: z.object({ suggestedCategory: z.string().optional() }) },
//   prompt: `You are an assistant that helps categorize expenses.
// Based on the expense description, suggest the most relevant category from the following list:
// ${PREDEFINED_EXPENSE_CATEGORIES.join(", ")}.

// If the description doesn't clearly fit into one of these categories, suggest "Other".
// Provide only the category name as your output.

// Expense Description: {{{userDescription}}}
// `,
// });


const extractExpenseDetailsGenkitFlow = ai.defineFlow(
  {
    name: 'extractExpenseDetailsFlow',
    inputSchema: ExtractExpenseDetailsInputSchema,
    outputSchema: ExtractExpenseDetailsOutputSchema,
  },
  async (input) => {
    if (input.receiptDataUri) {
      const { output } = await imageAnalysisPrompt(input);
      if (!output) {
        return {}; // Return empty object or specific error structure if preferred
      }
      const cleanedOutput: ExtractExpenseDetailsOutput = { ...output };
      if (cleanedOutput.extractedAmount && isNaN(Number(cleanedOutput.extractedAmount))) {
        cleanedOutput.extractedAmount = undefined; 
      } else if (cleanedOutput.extractedAmount) {
        cleanedOutput.extractedAmount = Number(parseFloat(String(cleanedOutput.extractedAmount)).toFixed(2));
      }
      return cleanedOutput;
    } else if (input.userDescription) {
      // If only description is provided, we currently don't have a separate text-only extraction for amount/date
      // We could add a new prompt for this if needed, or simply acknowledge no image means no full extraction.
      // For now, if no image, and only description, we might not be able to extract amount/date reliably.
      // The original intent here was category suggestion, which is now removed from this specific flow.
      return {}; // Return empty or indicate no extraction possible
    }
    return {}; // If no input is provided that can be processed
  }
);
