import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, numResults = 10 } = await req.json();
    
    if (!query) {
      throw new Error("Search query is required");
    }

    console.log(`Searching for: ${query}`);

    // Use SerpAPI for web search
    const SERPAPI_KEY = Deno.env.get("SERPAPI_KEY");
    
    if (!SERPAPI_KEY) {
      throw new Error("SERPAPI_KEY is not configured");
    }

    const searchResponse = await fetch(
      `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&num=${numResults}&api_key=${SERPAPI_KEY}`,
      {
        headers: {
          "Accept": "application/json",
        },
      }
    );

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error("SerpAPI error:", searchResponse.status, errorText);
      throw new Error("Search API error");
    }

    const searchData = await searchResponse.json();
    
    const results = searchData.organic_results?.map((result: any) => ({
      title: result.title,
      url: result.link,
      content: result.snippet || "",
    })) || [];

    console.log(`Found ${results.length} results`);

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Web search error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
