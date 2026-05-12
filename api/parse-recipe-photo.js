export default async function handler(req, res) {
  // Allow CORS from your app
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "No URL provided" });

  try {
    // Fetch the page
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; MealKeeper/1.0)",
        "Accept": "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) throw new Error(`Failed to fetch page: ${response.status}`);

    const html = await response.text();

    // ── Try JSON-LD schema first (most reliable) ──────────────────────────
    let recipe = null;
    const jsonLdMatches = html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);

    for (const match of jsonLdMatches) {
      try {
        const json = JSON.parse(match[1].trim());
        const schemas = Array.isArray(json) ? json : json["@graph"] ? json["@graph"] : [json];
        for (const schema of schemas) {
          if (schema["@type"] === "Recipe" || (Array.isArray(schema["@type"]) && schema["@type"].includes("Recipe"))) {
            recipe = schema;
            break;
          }
        }
      } catch {}
      if (recipe) break;
    }

    if (!recipe) {
      return res.status(422).json({ error: "No recipe found on this page. Try a different URL from a recipe website." });
    }

    // ── Parse name ────────────────────────────────────────────────────────
    const name = recipe.name || "";

    // ── Parse ingredients ─────────────────────────────────────────────────
    const rawIngredients = recipe.recipeIngredient || [];
    const ingredients = rawIngredients.map((line) => {
      // Try to split "500g ground beef" into amount + name
      const match = line.trim().match(/^([\d\/\s¼½¾⅓⅔⅛⅜⅝⅞]+\s*(?:g|kg|ml|l|oz|lb|cup|cups|tbsp|tsp|tablespoon|tablespoons|teaspoon|teaspoons|can|cans|bunch|clove|cloves|slice|slices|handful|pinch|sprig|sprigs|medium|large|small)?\.?)\s+(.+)$/i);
      if (match) {
        return { amount: match[1].trim(), name: match[2].trim() };
      }
      return { amount: "", name: line.trim() };
    });

    // ── Parse method ──────────────────────────────────────────────────────
    let method = "";
    const instructions = recipe.recipeInstructions;
    if (Array.isArray(instructions)) {
      method = instructions.map((step, i) => {
        const text = typeof step === "string" ? step : step.text || "";
        return `${i + 1}. ${text.trim()}`;
      }).join("\n");
    } else if (typeof instructions === "string") {
      method = instructions.trim();
    }

    // ── Parse times ───────────────────────────────────────────────────────
    const parseDuration = (iso) => {
      if (!iso) return "";
      const h = iso.match(/(\d+)H/i);
      const m = iso.match(/(\d+)M/i);
      const hours   = h ? parseInt(h[1]) : 0;
      const minutes = m ? parseInt(m[1]) : 0;
      if (hours && minutes) return `${hours}hr ${minutes} mins`;
      if (hours) return `${hours} hr${hours > 1 ? "s" : ""}`;
      if (minutes) return `${minutes} mins`;
      return "";
    };

    const prepTime = parseDuration(recipe.prepTime);
    const cookTime = parseDuration(recipe.cookTime || recipe.totalTime);

    // ── Parse servings ────────────────────────────────────────────────────
    let servings = 4;
    const yieldRaw = recipe.recipeYield;
    if (yieldRaw) {
      const yieldStr = Array.isArray(yieldRaw) ? yieldRaw[0] : yieldRaw;
      const num = parseInt(String(yieldStr).match(/\d+/)?.[0]);
      if (!isNaN(num)) servings = num;
    }

    // ── Parse image ───────────────────────────────────────────────────────
    // We return the image URL rather than base64 to keep the response small
    let imageUrl = "";
    if (recipe.image) {
      if (typeof recipe.image === "string") imageUrl = recipe.image;
      else if (Array.isArray(recipe.image)) imageUrl = typeof recipe.image[0] === "string" ? recipe.image[0] : recipe.image[0]?.url || "";
      else if (recipe.image.url) imageUrl = recipe.image.url;
    }

    // ── Parse category/tags ───────────────────────────────────────────────
    const tags = [];
    if (recipe.keywords) {
      const kw = typeof recipe.keywords === "string" ? recipe.keywords.split(",") : recipe.keywords;
      kw.slice(0, 5).forEach(k => { const t = k.trim(); if (t) tags.push(t); });
    }

    return res.status(200).json({
      name,
      ingredients,
      method,
      prepTime,
      cookTime,
      servings,
      imageUrl,
      tags,
      sourceUrl: url,
    });

  } catch (err) {
    console.error("Recipe parse error:", err);
    return res.status(500).json({ error: "Something went wrong fetching that page. Please check the URL and try again." });
  }
}