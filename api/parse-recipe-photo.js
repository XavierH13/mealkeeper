export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { imageBase64, mimeType } = req.body;
  if (!imageBase64) return res.status(400).json({ error: "No image provided" });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Gemini API key not configured" });

  const prompt = `You are a recipe extraction assistant. Look at this image of a recipe and extract all the details.

Return ONLY a valid JSON object with exactly these fields (no markdown, no backticks, just raw JSON):
{
  "name": "Recipe name",
  "servings": 4,
  "prepTime": "15 mins",
  "cookTime": "30 mins",
  "ingredients": [
    { "name": "ingredient name", "amount": "amount and unit" },
    { "name": "ingredient name", "amount": "amount and unit" }
  ],
  "method": "Step 1. ...\nStep 2. ...\nStep 3. ...",
  "tags": ["tag1", "tag2"]
}

Rules:
- For ingredients, separate the amount (e.g. "500g", "2 tbsp", "1 large") from the name (e.g. "chicken breast", "olive oil")
- If you cannot read an amount clearly, leave it as an empty string ""
- For method, put each step on its own line starting with the step number
- For tags, suggest 1-3 relevant tags from: Quick, Vegetarian, Vegan, Gluten-Free, Family Favourite, Comfort Food, Healthy, High Protein, Low Carb
- If you cannot find a field, use a sensible default (empty string for text, 4 for servings, empty array for lists)
- If this image does not appear to contain a recipe, return { "error": "No recipe found in image" }`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: mimeType || "image/jpeg",
                  data: imageBase64,
                }
              }
            ]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2048,
          }
        })
      }
    );

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || "Gemini API error");
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Strip any markdown code fences if Gemini adds them
    const clean = text.replace(/```json\n?/gi,"").replace(/```\n?/g,"").trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch {
      throw new Error("Could not parse recipe from image. Please try a clearer photo.");
    }

    if (parsed.error) {
      return res.status(422).json({ error: parsed.error });
    }

    return res.status(200).json(parsed);

  } catch (err) {
    console.error("Gemini photo parse error:", err);
    return res.status(500).json({ error: err.message || "Something went wrong processing the photo." });
  }
}