import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getLLMProvider } from '@/lib/llm/providers';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const { userQuery, businessData } = await req.json();
    
    // Initialize LLM Provider (will use Ollama if configured in env)
    const provider = getLLMProvider();
    
    // If no data provided, try to fetch sample data from our newly created view
    let dataToAnalyze = businessData;
    if (!dataToAnalyze) {
        try {
            const cookieStore = await cookies();
            const supabase = createServerSupabaseClient(cookieStore);
            const { data: salesData, error } = await supabase
                .from('monthly_sales_summary')
                .select('*')
                .limit(12);
                
            if (!error && salesData && salesData.length > 0) {
                dataToAnalyze = salesData;
            } else {
                // Fallback if table doesn't exist yet (migration not run)
                dataToAnalyze = [
                   { month: '2024-01-01', category: 'Electronics', total_revenue: 15000000, items: 10 },
                   { month: '2024-02-01', category: 'Electronics', total_revenue: 25000000, items: 25 },
                   { month: '2024-03-01', category: 'Furniture', total_revenue: 12000000, items: 12 }
                ];
            }
        } catch (e) {
            console.warn('Failed to fetch from Supabase, using context-less mode');
        }
    }

    const systemPrompt = `You are a Data Visualization Expert.
Your goal is to transform raw business data into a structured JSON format suitable for Recharts visualization.

INPUT DATA:
${JSON.stringify(dataToAnalyze).substring(0, 2000)} -- truncated if too long

USER REQUEST: "${userQuery}"

OUTPUT FORMAT:
You MUST respond with ONLY a valid JSON object. Do not add markdown formatting or explanation.
The JSON must follow this matching schema for the frontend renderer:

{
  "chartType": "bar" | "line" | "pie" | "area",
  "title": "A descriptive title for the chart",
  "data": [
    { "name": "Label 1", "value": 123, ...other_keys },
    { "name": "Label 2", "value": 456, ...other_keys }
  ],
  "xKey": "key to use for X axis (usually 'name' or 'date')",
  "yKey": "key to use for Y axis (usually 'value' or 'revenue')",
  "message": "Brief (1 sentence) explanation of what this chart shows"
}

RULES:
1. Extract relevant data points.
2. Choose the best chart type for the data (Line for trends, Bar for comparison, Pie for distribution).
3. Ensure 'data' is an array of objects.
4. 'xKey' and 'yKey' MUST match the keys in the 'data' objects.
`;

    // Generate response from Llama 3
    const response = await provider.generateResponse(
        [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Generate a chart for: ${userQuery}` }
        ],
        {
            temperature: 0.1, // Low temperature for consistent JSON
        }
    );

    // Parse JSON from response
    let jsonResult;
    try {
        // Clean up markdown code blocks if present
        const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
        jsonResult = JSON.parse(cleanJson);
        
        // Map to internal ChartRenderer format if needed (it already matches mostly)
        // ChartRenderer expects 'type', user plan had 'chartType'
        jsonResult.type = jsonResult.chartType; 
    } catch (parseError) {
        console.error('JSON Parse Error:', parseError);
        console.log('Raw Response:', response);
        return NextResponse.json(
            { error: 'Failed to generate valid chart JSON', raw: response },
            { status: 500 }
        );
    }

    return NextResponse.json(jsonResult);
    
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
