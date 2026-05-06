import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

// ── Supabase client ───────────────────────────────────────────────────────────
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ── Constants ─────────────────────────────────────────────────────────────────
const DAYS  = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const SLOTS = ["Breakfast","Lunch","Dinner"];
const EMOJIS = ["🍽️","🥘","🍳","🥗","🍜","🍝","🌮","🥙","🍱","🥩","🍣","🍲","🥞","🧆","🫕","🥐","🍕","🥚","🫔","🍛"];
const ALL_TAGS = ["Quick","Vegetarian","Vegan","Gluten-Free","Dairy-Free","Family Favourite","Meal Prep","Low Carb","High Protein","Comfort Food","Healthy","Budget"];
const SHOP_CATEGORIES = ["Produce","Meat & Fish","Dairy & Eggs","Bakery","Pantry","Frozen","Drinks","Other"];

const INGREDIENT_CATEGORY_MAP = {
  lettuce:"Produce",tomato:"Produce",tomatoes:"Produce",onion:"Produce",onions:"Produce",
  garlic:"Produce",lemon:"Produce",lemons:"Produce",lime:"Produce",limes:"Produce",
  ginger:"Produce",carrot:"Produce",carrots:"Produce",potato:"Produce",potatoes:"Produce",
  spinach:"Produce",broccoli:"Produce",pepper:"Produce",peppers:"Produce",
  mushroom:"Produce",mushrooms:"Produce",courgette:"Produce",zucchini:"Produce",
  celery:"Produce",cucumber:"Produce",avocado:"Produce",basil:"Produce",parsley:"Produce",
  coriander:"Produce","romaine lettuce":"Produce","mixed vegetables":"Produce","spring onions":"Produce",
  chicken:"Meat & Fish",beef:"Meat & Fish",pork:"Meat & Fish",lamb:"Meat & Fish",
  salmon:"Meat & Fish",tuna:"Meat & Fish",mince:"Meat & Fish",bacon:"Meat & Fish",
  sausage:"Meat & Fish",sausages:"Meat & Fish",prawns:"Meat & Fish",shrimp:"Meat & Fish",
  fish:"Meat & Fish",turkey:"Meat & Fish","ground beef":"Meat & Fish",
  "chicken breast":"Meat & Fish","chicken thighs":"Meat & Fish",
  milk:"Dairy & Eggs",cheese:"Dairy & Eggs",butter:"Dairy & Eggs",cream:"Dairy & Eggs",
  yogurt:"Dairy & Eggs",yoghurt:"Dairy & Eggs",egg:"Dairy & Eggs",eggs:"Dairy & Eggs",
  parmesan:"Dairy & Eggs",mozzarella:"Dairy & Eggs","parmesan cheese":"Dairy & Eggs",
  "cream cheese":"Dairy & Eggs","creme fraiche":"Dairy & Eggs",
  bread:"Bakery",bun:"Bakery",buns:"Bakery",roll:"Bakery",rolls:"Bakery",
  wrap:"Bakery",wraps:"Bakery",tortilla:"Bakery",tortillas:"Bakery",pitta:"Bakery",
  pasta:"Pantry",rice:"Pantry",spaghetti:"Pantry",flour:"Pantry",sugar:"Pantry",
  oil:"Pantry","olive oil":"Pantry","soy sauce":"Pantry",salt:"Pantry",
  stock:"Pantry",broth:"Pantry",vinegar:"Pantry",sauce:"Pantry",
  "sesame oil":"Pantry","coconut milk":"Pantry","canned tomatoes":"Pantry",
  "tomato paste":"Pantry","tomato puree":"Pantry",croutons:"Pantry",
  "caesar dressing":"Pantry","balsamic vinegar":"Pantry",
  "frozen peas":"Frozen","frozen corn":"Frozen","ice cream":"Frozen",
  juice:"Drinks",wine:"Drinks",beer:"Drinks",water:"Drinks",
};

const guessCategory = (name) => {
  const lower = name.toLowerCase().trim();
  if (INGREDIENT_CATEGORY_MAP[lower]) return INGREDIENT_CATEGORY_MAP[lower];
  for (const [key,cat] of Object.entries(INGREDIENT_CATEGORY_MAP)) {
    if (lower.includes(key)) return cat;
  }
  return "Other";
};

const generateId  = () => Math.random().toString(36).slice(2,9);
const BLANK_RECIPE = { name:"",emoji:"🍽️",servings:2,prepTime:"",cookTime:"",tags:[],ingredients:[{name:"",amount:""}],method:"",photo:"",isPublic:false };

const scaleAmount = (amount,factor) => {
  if (!amount||factor===1) return amount;
  const m = amount.trim().match(/^([\d.,]+)\s*([a-zA-Z%]*)$/);
  if (!m) return amount;
  const num = parseFloat(m[1].replace(",","."));
  if (isNaN(num)) return amount;
  const scaled = num*factor;
  const display = Number.isInteger(scaled)?scaled:parseFloat(scaled.toFixed(2));
  return `${display}${m[2]||""}`;
};

const lbl = { fontSize:12,color:"#888",display:"block",marginBottom:4,marginTop:12 };
const inp = (extra={}) => ({ width:"100%",padding:"9px 12px",border:"1px solid #ddd",borderRadius:8,fontSize:14,boxSizing:"border-box",...extra });

// ── Shared Recipe Page (no login needed) ──────────────────────────────────────
function SharedRecipePage({ shareId, onBack }) {
  const [recipe, setRecipe] = useState(null);
  const [author, setAuthor] = useState("");
  const [loading, setLoading] = useState(true);
  const [saved, setSaved]   = useState(false);
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({data:{session}})=>setSession(session));
    (async () => {
      const { data } = await supabase
        .from("recipes")
        .select("data, author_name")
        .eq("share_id", shareId)
        .eq("is_public", true)
        .single();
      if (data) { setRecipe(data.data); setAuthor(data.author_name||""); }
      setLoading(false);
    })();
  }, [shareId]);

  const addToMyRecipes = async () => {
    if (!session) return;
    const uid  = session.user.id;
    const copy = { ...recipe, id:generateId(), isPublic:false };
    await supabase.from("recipes").insert({ id:copy.id, user_id:uid, data:copy, is_public:false, author_name:"" });
    setSaved(true);
  };

  if (loading) return <Centered>Loading recipe…</Centered>;
  if (!recipe)  return (
    <Centered>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:48,marginBottom:12}}>😕</div>
        <div style={{fontSize:18,fontWeight:"bold",marginBottom:8}}>Recipe not found</div>
        <div style={{color:"#888",fontSize:14,marginBottom:20}}>This link may have expired or the recipe was made private.</div>
        <button onClick={onBack} style={btnDark}>Go to MealKeeper</button>
      </div>
    </Centered>
  );

  return (
    <div style={{fontFamily:"Georgia,serif",minHeight:"100vh",background:"#faf8f4",color:"#2c2416"}}>
      <header style={{background:"#2c2416",color:"#faf8f4",padding:"16px 24px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{fontSize:18,fontWeight:"bold"}}>🥄 MealKeeper</div>
        <button onClick={onBack} style={{background:"none",border:"1px solid rgba(255,255,255,0.3)",borderRadius:6,color:"#faf8f4",padding:"6px 14px",cursor:"pointer",fontSize:13}}>← Back</button>
      </header>
      <div style={{maxWidth:600,margin:"40px auto",padding:"0 20px"}}>
        {recipe.photo
          ?<img src={recipe.photo} alt={recipe.name} style={{width:"100%",height:240,objectFit:"cover",borderRadius:14,marginBottom:24}}/>
          :<div style={{background:"#fef3e2",borderRadius:14,padding:"32px",textAlign:"center",fontSize:72,marginBottom:24}}>{recipe.emoji}</div>}

        <div style={{background:"#fff",borderRadius:14,border:"1px solid #e8e0d0",padding:"28px"}}>
          <div style={{fontSize:26,fontWeight:"bold",marginBottom:6}}>{recipe.name}</div>
          <div style={{fontSize:13,color:"#888",marginBottom:4}}>
            Shared by <strong>{author||"a MealKeeper user"}</strong>
          </div>
          <div style={{fontSize:13,color:"#888",marginBottom:12}}>
            Serves {recipe.servings}
            {recipe.prepTime&&` · 🕐 ${recipe.prepTime}`}
            {recipe.cookTime&&` · 🍳 ${recipe.cookTime}`}
          </div>
          {(recipe.tags||[]).length>0&&(
            <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:16}}>
              {recipe.tags.map(t=><span key={t} style={{background:"#f0ead8",color:"#6a5a40",borderRadius:20,padding:"3px 10px",fontSize:12}}>{t}</span>)}
            </div>
          )}

          {session&&(
            <button onClick={addToMyRecipes} disabled={saved} style={{width:"100%",padding:"12px",background:saved?"#27ae60":"#e8a020",color:saved?"#fff":"#2c2416",border:"none",borderRadius:10,fontWeight:"bold",fontSize:15,cursor:saved?"default":"pointer",marginBottom:24}}>
              {saved?"✓ Added to my recipes!":"+ Add to my recipes"}
            </button>
          )}
          {!session&&(
            <div style={{background:"#fef3e2",border:"1px solid #e8c870",borderRadius:8,padding:"12px 16px",marginBottom:24,fontSize:13,textAlign:"center"}}>
              <a href="/" style={{color:"#e8a020",fontWeight:"bold"}}>Log in to MealKeeper</a> to save this recipe to your collection.
            </div>
          )}

          <h3 style={{fontSize:13,textTransform:"uppercase",letterSpacing:1,color:"#888",margin:"0 0 10px"}}>Ingredients</h3>
          {recipe.ingredients.map((ing,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #f0ead8",fontSize:14}}>
              <span>{ing.name}</span>
              <span style={{fontWeight:"bold",color:"#555"}}>{ing.amount}</span>
            </div>
          ))}

          {recipe.method&&<>
            <h3 style={{fontSize:13,textTransform:"uppercase",letterSpacing:1,color:"#888",margin:"20px 0 10px"}}>Method</h3>
            {recipe.method.split("\n").map((line,i)=>line.trim()?<p key={i} style={{margin:"0 0 10px",fontSize:14,lineHeight:1.8}}>{line}</p>:null)}
          </>}
        </div>
      </div>
    </div>
  );
}

// ── Community Browse Tab ──────────────────────────────────────────────────────
function CommunityTab({ myRecipeIds, onAddToMine }) {
  const [recipes, setRecipes]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [activeTag, setActiveTag] = useState(null);
  const [viewing, setViewing]   = useState(null);
  const [addedIds, setAddedIds] = useState({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("recipes")
        .select("id, data, author_name, share_id")
        .eq("is_public", true)
        .order("created_at", { ascending:false });
      setRecipes(data||[]);
      setLoading(false);
    })();
  }, []);

  const allTags = [...new Set(recipes.flatMap(r=>(r.data.tags||[])))];
  const filtered = recipes.filter(r => {
    const ms = r.data.name.toLowerCase().includes(search.toLowerCase());
    const mt = !activeTag || (r.data.tags||[]).includes(activeTag);
    return ms && mt;
  });

  const handleAdd = async (row) => {
    await onAddToMine(row.data);
    setAddedIds(p=>({...p,[row.id]:true}));
  };

  const copyLink = (shareId) => {
    navigator.clipboard.writeText(`${window.location.origin}/?recipe=${shareId}`);
  };

  return (
    <div>
      <div style={{marginBottom:20}}>
        <h2 style={{margin:"0 0 4px",fontSize:20}}>Community Recipes</h2>
        <p style={{margin:"0 0 16px",fontSize:13,color:"#888"}}>Recipes shared publicly by MealKeeper users. Add any to your own collection.</p>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍  Search community recipes…"
          style={{width:"100%",padding:"10px 14px",border:"1px solid #ddd",borderRadius:10,fontSize:14,boxSizing:"border-box",marginBottom:12}}/>
        {allTags.length>0&&(
          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8}}>
            <span onClick={()=>setActiveTag(null)} style={{background:!activeTag?"#2c2416":"#f0ead8",color:!activeTag?"#faf8f4":"#6a5a40",borderRadius:20,padding:"4px 12px",fontSize:12,cursor:"pointer"}}>All</span>
            {allTags.map(t=>(
              <span key={t} onClick={()=>setActiveTag(activeTag===t?null:t)} style={{background:activeTag===t?"#2c2416":"#f0ead8",color:activeTag===t?"#faf8f4":"#6a5a40",borderRadius:20,padding:"4px 12px",fontSize:12,cursor:"pointer"}}>{t}</span>
            ))}
          </div>
        )}
      </div>

      {loading&&<Centered>Loading community recipes…</Centered>}
      {!loading&&filtered.length===0&&(
        <div style={{textAlign:"center",padding:"48px 20px",color:"#999"}}>
          <div style={{fontSize:48,marginBottom:12}}>🍽️</div>
          <div style={{fontSize:16}}>No public recipes yet.</div>
          <div style={{fontSize:13,marginTop:8}}>Be the first! Make one of your recipes public from the Recipes tab.</div>
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:16}}>
        {filtered.map(row=>{
          const r = row.data;
          const alreadyMine = myRecipeIds.includes(row.id) || addedIds[row.id];
          return (
            <div key={row.id} style={{background:"#fff",borderRadius:12,border:"1px solid #e8e0d0",overflow:"hidden",display:"flex",flexDirection:"column"}}>
              {r.photo
                ?<img src={r.photo} alt={r.name} style={{width:"100%",height:140,objectFit:"cover"}}/>
                :<div style={{background:"#fef3e2",padding:"20px",textAlign:"center",fontSize:44}}>{r.emoji}</div>}
              <div style={{padding:"12px 14px",flex:1,display:"flex",flexDirection:"column"}}>
                <div style={{fontWeight:"bold",fontSize:15,marginBottom:3}}>{r.name}</div>
                <div style={{fontSize:11,color:"#aaa",marginBottom:4}}>by {row.author_name||"Anonymous"}</div>
                <div style={{fontSize:12,color:"#888",marginBottom:8}}>
                  Serves {r.servings}
                  {r.prepTime&&` · 🕐 ${r.prepTime}`}
                  {r.cookTime&&` · 🍳 ${r.cookTime}`}
                </div>
                {(r.tags||[]).length>0&&(
                  <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:10}}>
                    {r.tags.map(t=><span key={t} style={{background:"#f0ead8",color:"#6a5a40",borderRadius:20,padding:"2px 8px",fontSize:11}}>{t}</span>)}
                  </div>
                )}
                <div style={{marginTop:"auto",display:"flex",flexDirection:"column",gap:6}}>
                  <button onClick={()=>setViewing(row)} style={{width:"100%",background:"#fef3e2",border:"1px solid #e8c870",borderRadius:6,padding:"7px",color:"#2c2416",fontSize:12,cursor:"pointer",fontWeight:"bold"}}>📋 View Recipe</button>
                  <div style={{display:"flex",gap:6}}>
                    <button onClick={()=>handleAdd(row)} disabled={alreadyMine} style={{flex:1,background:alreadyMine?"#f0fff4":"#e8a020",border:alreadyMine?"1px solid #9dc":"none",borderRadius:6,padding:"6px",color:alreadyMine?"#27ae60":"#2c2416",fontSize:12,cursor:alreadyMine?"default":"pointer",fontWeight:"bold"}}>
                      {alreadyMine?"✓ Saved":"+ Save"}
                    </button>
                    <button onClick={()=>copyLink(row.share_id)} style={{flex:1,background:"#f0f0ff",border:"1px solid #c0c0e8",borderRadius:6,padding:"6px",color:"#3a3080",fontSize:12,cursor:"pointer"}}>🔗 Copy link</button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* View community recipe modal */}
      {viewing&&(
        <Modal onClose={()=>setViewing(null)}>
          <div style={{width:520,maxHeight:"88vh",overflowY:"auto"}}>
            {viewing.data.photo
              ?<img src={viewing.data.photo} alt={viewing.data.name} style={{width:"100%",height:200,objectFit:"cover",borderRadius:"14px 14px 0 0"}}/>
              :<div style={{background:"#2c2416",padding:"28px",borderRadius:"14px 14px 0 0",textAlign:"center",fontSize:56}}>{viewing.data.emoji}</div>}
            <div style={{padding:"20px 28px"}}>
              <div style={{fontSize:22,fontWeight:"bold"}}>{viewing.data.name}</div>
              <div style={{fontSize:12,color:"#aaa",marginBottom:4}}>by {viewing.author_name||"Anonymous"}</div>
              <div style={{fontSize:13,color:"#888",marginBottom:12}}>
                Serves {viewing.data.servings}
                {viewing.data.prepTime&&` · 🕐 ${viewing.data.prepTime}`}
                {viewing.data.cookTime&&` · 🍳 ${viewing.data.cookTime}`}
              </div>
              {(viewing.data.tags||[]).length>0&&(
                <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:16}}>
                  {viewing.data.tags.map(t=><span key={t} style={{background:"#f0ead8",color:"#6a5a40",borderRadius:20,padding:"3px 10px",fontSize:12}}>{t}</span>)}
                </div>
              )}
              <h3 style={{fontSize:12,textTransform:"uppercase",letterSpacing:1,color:"#888",margin:"0 0 10px"}}>Ingredients</h3>
              {viewing.data.ingredients.map((ing,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #f0ead8",fontSize:14}}>
                  <span>{ing.name}</span><span style={{fontWeight:"bold",color:"#555"}}>{ing.amount}</span>
                </div>
              ))}
              {viewing.data.method&&<>
                <h3 style={{fontSize:12,textTransform:"uppercase",letterSpacing:1,color:"#888",margin:"20px 0 10px"}}>Method</h3>
                {viewing.data.method.split("\n").map((line,i)=>line.trim()?<p key={i} style={{margin:"0 0 10px",fontSize:14,lineHeight:1.8}}>{line}</p>:null)}
              </>}
              <div style={{display:"flex",gap:10,marginTop:20}}>
                <button onClick={()=>{handleAdd(viewing);setViewing(null);}} disabled={myRecipeIds.includes(viewing.id)||addedIds[viewing.id]} style={{flex:1,padding:"11px",border:"none",borderRadius:8,background:myRecipeIds.includes(viewing.id)||addedIds[viewing.id]?"#27ae60":"#e8a020",color:myRecipeIds.includes(viewing.id)||addedIds[viewing.id]?"#fff":"#2c2416",fontWeight:"bold",cursor:"pointer",fontSize:14}}>
                  {myRecipeIds.includes(viewing.id)||addedIds[viewing.id]?"✓ Already saved":"+ Add to my recipes"}
                </button>
                <button onClick={()=>setViewing(null)} style={{flex:1,padding:"11px",border:"none",borderRadius:8,background:"#2c2416",color:"#faf8f4",fontWeight:"bold",cursor:"pointer",fontSize:14}}>Close</button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Auth Screen ───────────────────────────────────────────────────────────────
function AuthScreen() {
  const [mode, setMode]         = useState("login");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [name, setName]         = useState("");
  const [error, setError]       = useState("");
  const [message, setMessage]   = useState("");
  const [loading, setLoading]   = useState(false);

  const handle = async () => {
    setError(""); setMessage(""); setLoading(true);
    try {
      if (mode==="signup") {
        const {error} = await supabase.auth.signUp({email,password,options:{data:{full_name:name}}});
        if (error) throw error;
        setMessage("Account created! Check your email to confirm, then log in.");
        setMode("login");
      } else if (mode==="login") {
        const {error} = await supabase.auth.signInWithPassword({email,password});
        if (error) throw error;
      } else {
        const {error} = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
        setMessage("Password reset email sent!");
      }
    } catch(e) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div style={{minHeight:"100vh",background:"#faf8f4",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Georgia,serif",padding:20}}>
      <div style={{background:"#fff",borderRadius:16,padding:40,width:"100%",maxWidth:400,boxShadow:"0 4px 24px rgba(0,0,0,0.08)"}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontSize:48,marginBottom:8}}>🥄</div>
          <div style={{fontSize:24,fontWeight:"bold",color:"#2c2416",letterSpacing:1}}>MealKeeper</div>
          <div style={{fontSize:13,color:"#aaa",marginTop:4}}>Plan. Shop. Cook.</div>
        </div>
        <h2 style={{margin:"0 0 24px",fontSize:18,color:"#2c2416",textAlign:"center"}}>
          {mode==="login"?"Welcome back":mode==="signup"?"Create an account":"Reset your password"}
        </h2>
        {error   &&<div style={{background:"#fff0f0",border:"1px solid #fcc",borderRadius:8,padding:"10px 14px",fontSize:13,color:"#c0392b",marginBottom:16}}>{error}</div>}
        {message &&<div style={{background:"#f0fff4",border:"1px solid #9dc",borderRadius:8,padding:"10px 14px",fontSize:13,color:"#27ae60",marginBottom:16}}>{message}</div>}
        {mode==="signup"&&<div style={{marginBottom:14}}><label style={{...lbl,marginTop:0}}>Your name</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="Jane Smith" style={inp()}/></div>}
        <div style={{marginBottom:14}}><label style={{...lbl,marginTop:0}}>Email address</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" style={inp()} onKeyDown={e=>e.key==="Enter"&&handle()}/></div>
        {mode!=="reset"&&<div style={{marginBottom:24}}><label style={lbl}>Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" style={inp()} onKeyDown={e=>e.key==="Enter"&&handle()}/></div>}
        <button onClick={handle} disabled={loading} style={{width:"100%",padding:"13px",background:"#2c2416",color:"#faf8f4",border:"none",borderRadius:10,fontSize:15,fontWeight:"bold",cursor:loading?"not-allowed":"pointer",opacity:loading?0.7:1,marginBottom:16}}>
          {loading?"Please wait…":mode==="login"?"Log in":mode==="signup"?"Create account":"Send reset email"}
        </button>
        <div style={{textAlign:"center",fontSize:13,color:"#888"}}>
          {mode==="login"&&<><span onClick={()=>{setMode("reset");setError("");setMessage("");}} style={{color:"#e8a020",cursor:"pointer"}}>Forgot password?</span><span style={{margin:"0 8px"}}>·</span><span onClick={()=>{setMode("signup");setError("");setMessage("");}} style={{color:"#e8a020",cursor:"pointer"}}>Create an account</span></>}
          {mode==="signup"&&<>Already have an account? <span onClick={()=>{setMode("login");setError("");setMessage("");}} style={{color:"#e8a020",cursor:"pointer"}}>Log in</span></>}
          {mode==="reset"&&<span onClick={()=>{setMode("login");setError("");setMessage("");}} style={{color:"#e8a020",cursor:"pointer"}}>← Back to login</span>}
        </div>
      </div>
    </div>
  );
}

// ── Recipe Form ───────────────────────────────────────────────────────────────
function RecipeForm({ initial, onSave, onCancel, title }) {
  const [r, setR] = useState(initial);
  const [customTagInput, setCustomTagInput] = useState("");
  const fileRef = useRef();
  const set = (k,v) => setR(p=>({...p,[k]:v}));
  const handlePhoto = (e) => {
    const file=e.target.files[0]; if (!file) return;
    const reader=new FileReader();
    reader.onload=ev=>set("photo",ev.target.result);
    reader.readAsDataURL(file);
  };
  const addTag = (t) => { const c=t.trim(); if (c&&!r.tags.includes(c)) set("tags",[...r.tags,c]); };
  const removeTag = (t) => set("tags",r.tags.filter(x=>x!==t));
  const submitCustomTag = () => { addTag(customTagInput); setCustomTagInput(""); };
  const updIng = (i,k,v) => { const a=[...r.ingredients]; a[i]={...a[i],[k]:v}; set("ingredients",a); };
  const save = () => { if (!r.name.trim()) return; onSave({...r,ingredients:r.ingredients.filter(i=>i.name.trim())}); };

  return (
    <div style={{background:"#fff",borderRadius:14,padding:28,width:520,maxHeight:"88vh",overflowY:"auto",boxSizing:"border-box"}} onClick={e=>e.stopPropagation()}>
      <h3 style={{margin:"0 0 16px",fontSize:18}}>{title}</h3>
      {r.photo
        ?<div style={{position:"relative",marginBottom:12}}><img src={r.photo} alt="" style={{width:"100%",height:160,objectFit:"cover",borderRadius:10}}/><button onClick={()=>set("photo","")} style={{position:"absolute",top:8,right:8,background:"rgba(0,0,0,0.55)",border:"none",color:"#fff",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:12}}>✕ Remove</button></div>
        :<button onClick={()=>fileRef.current.click()} style={{width:"100%",padding:"13px",border:"1.5px dashed #ccc",borderRadius:10,background:"#faf8f4",color:"#888",cursor:"pointer",fontSize:13,marginBottom:12}}>📷 Add a photo</button>}
      <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{display:"none"}}/>
      <div style={{display:"flex",gap:10,alignItems:"flex-end"}}>
        <div><label style={lbl}>Emoji</label><select value={r.emoji} onChange={e=>set("emoji",e.target.value)} style={{fontSize:22,border:"1px solid #ddd",borderRadius:8,padding:"8px",background:"#faf8f4"}}>{EMOJIS.map(e=><option key={e} value={e}>{e}</option>)}</select></div>
        <div style={{flex:1}}><label style={lbl}>Recipe Name *</label><input value={r.name} onChange={e=>set("name",e.target.value)} placeholder="e.g. Chicken Tacos" style={inp()}/></div>
        <div style={{width:72}}><label style={lbl}>Serves</label><input type="number" min={1} value={r.servings} onChange={e=>set("servings",parseInt(e.target.value)||1)} style={inp({textAlign:"center"})}/></div>
      </div>
      <div style={{display:"flex",gap:10}}>
        <div style={{flex:1}}><label style={lbl}>Prep time</label><input value={r.prepTime||""} onChange={e=>set("prepTime",e.target.value)} placeholder="e.g. 15 mins" style={inp()}/></div>
        <div style={{flex:1}}><label style={lbl}>Cook time</label><input value={r.cookTime||""} onChange={e=>set("cookTime",e.target.value)} placeholder="e.g. 30 mins" style={inp()}/></div>
      </div>
      <label style={lbl}>Tags</label>
      {r.tags.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:8}}>{r.tags.map(t=><span key={t} style={{background:"#2c2416",color:"#faf8f4",borderRadius:20,padding:"3px 10px",fontSize:12,display:"flex",alignItems:"center",gap:4}}>{t} <span onClick={()=>removeTag(t)} style={{cursor:"pointer",opacity:0.7,fontSize:14}}>×</span></span>)}</div>}
      <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:8}}>{ALL_TAGS.filter(t=>!r.tags.includes(t)).map(t=><span key={t} onClick={()=>addTag(t)} style={{background:"#f0ead8",color:"#6a5a40",borderRadius:20,padding:"3px 10px",fontSize:12,cursor:"pointer"}}>+ {t}</span>)}</div>
      <div style={{display:"flex",gap:6,marginBottom:4}}>
        <input value={customTagInput} onChange={e=>setCustomTagInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();submitCustomTag();}}} placeholder="Create your own tag…" style={{flex:1,padding:"7px 11px",border:"1px solid #ddd",borderRadius:20,fontSize:12,outline:"none"}}/>
        <button onClick={submitCustomTag} style={{padding:"7px 14px",background:"#2c2416",color:"#faf8f4",border:"none",borderRadius:20,fontSize:12,cursor:"pointer",whiteSpace:"nowrap"}}>+ Add</button>
      </div>
      <label style={lbl}>Ingredients</label>
      {r.ingredients.map((ing,i)=>(
        <div key={i} style={{display:"flex",gap:8,marginBottom:8}}>
          <input value={ing.name} onChange={e=>updIng(i,"name",e.target.value)} placeholder="Ingredient name" style={{...inp(),flex:2}}/>
          <input value={ing.amount} onChange={e=>updIng(i,"amount",e.target.value)} placeholder="Amount" style={{...inp(),flex:1}}/>
          {r.ingredients.length>1&&<button onClick={()=>set("ingredients",r.ingredients.filter((_,j)=>j!==i))} style={{background:"none",border:"none",color:"#c0392b",fontSize:18,cursor:"pointer",padding:"0 4px"}}>×</button>}
        </div>
      ))}
      <button onClick={()=>set("ingredients",[...r.ingredients,{name:"",amount:""}])} style={{background:"none",border:"1px dashed #ccc",borderRadius:8,padding:"8px 16px",color:"#888",cursor:"pointer",fontSize:13,marginBottom:14,width:"100%"}}>+ Add ingredient</button>
      <label style={lbl}>Method / Instructions</label>
      <textarea value={r.method||""} onChange={e=>set("method",e.target.value)} placeholder={"1. Preheat oven to 180°C…\n2. Mix the ingredients…"} rows={6} style={{width:"100%",padding:"10px 12px",border:"1px solid #ddd",borderRadius:8,fontSize:13,lineHeight:1.7,resize:"vertical",boxSizing:"border-box",fontFamily:"Georgia,serif",marginBottom:12,color:"#2c2416"}}/>

      {/* Public toggle */}
      <div style={{display:"flex",alignItems:"center",gap:10,background:"#faf8f4",border:"1px solid #e8e0d0",borderRadius:8,padding:"12px 14px",marginBottom:20}}>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:"bold"}}>Share publicly</div>
          <div style={{fontSize:12,color:"#888"}}>Allow other MealKeeper users to discover and save this recipe.</div>
        </div>
        <div onClick={()=>set("isPublic",!r.isPublic)} style={{width:44,height:24,borderRadius:12,background:r.isPublic?"#27ae60":"#ddd",cursor:"pointer",position:"relative",transition:"background 0.2s",flexShrink:0}}>
          <div style={{position:"absolute",top:2,left:r.isPublic?20:2,width:20,height:20,borderRadius:10,background:"#fff",transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)"}}/>
        </div>
      </div>

      <div style={{display:"flex",gap:10}}>
        <button onClick={onCancel} style={{flex:1,padding:"11px",border:"1px solid #ddd",borderRadius:8,background:"none",cursor:"pointer",fontSize:14}}>Cancel</button>
        <button onClick={save} style={{flex:2,padding:"11px",border:"none",borderRadius:8,background:"#e8a020",color:"#2c2416",fontWeight:"bold",cursor:"pointer",fontSize:14}}>Save Recipe</button>
      </div>
    </div>
  );
}

// ── Small shared components ───────────────────────────────────────────────────
function ScaleControl({ baseServings, onScale }) {
  const [s,setS] = useState(baseServings);
  const update = v => { setS(v); onScale(v); };
  const factor = s/baseServings;
  return (
    <div style={{display:"flex",alignItems:"center",gap:10,background:"#faf8f4",border:"1px solid #e8e0d0",borderRadius:8,padding:"9px 14px",marginTop:8}}>
      <span style={{fontSize:13,color:"#888",flexShrink:0}}>Servings:</span>
      <button onClick={()=>update(Math.max(1,s-1))} style={{width:28,height:28,borderRadius:6,border:"1px solid #ddd",background:"#fff",cursor:"pointer",fontSize:18,lineHeight:1,padding:0}}>−</button>
      <span style={{fontWeight:"bold",fontSize:16,minWidth:24,textAlign:"center"}}>{s}</span>
      <button onClick={()=>update(s+1)} style={{width:28,height:28,borderRadius:6,border:"1px solid #ddd",background:"#fff",cursor:"pointer",fontSize:18,lineHeight:1,padding:0}}>+</button>
      {factor!==1&&<span style={{fontSize:12,color:"#e8a020",marginLeft:4}}>×{parseFloat(factor.toFixed(2))}</span>}
      {factor!==1&&<button onClick={()=>update(baseServings)} style={{fontSize:11,color:"#999",background:"none",border:"none",cursor:"pointer",textDecoration:"underline"}}>reset</button>}
    </div>
  );
}

function Modal({ children, onClose }) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:16,overflowY:"auto"}} onClick={onClose}>
      <div style={{background:"#fff",borderRadius:14,maxHeight:"92vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>{children}</div>
    </div>
  );
}

function Checkbox({ checked }) {
  return (
    <div style={{width:22,height:22,borderRadius:6,border:"2px solid "+(checked?"#27ae60":"#c0b8a8"),background:checked?"#27ae60":"none",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
      {checked&&<span style={{color:"#fff",fontSize:13,lineHeight:1}}>✓</span>}
    </div>
  );
}

function Centered({ children }) {
  return <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"60vh",fontFamily:"Georgia,serif",color:"#999",fontSize:15}}>{children}</div>;
}

const btnDark = { padding:"11px 24px",background:"#2c2416",color:"#faf8f4",border:"none",borderRadius:8,fontWeight:"bold",cursor:"pointer",fontSize:14 };

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession]   = useState(undefined);
  const [tab, setTab]           = useState("planner");
  const [recipes, setRecipes]   = useState([]);
  const [mealPlan, setMealPlan] = useState({});
  const [checkedItems, setCheckedItems] = useState({});
  const [manualItems, setManualItems]   = useState([]);
  const [dbLoaded, setDbLoaded] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [shareToast, setShareToast] = useState("");

  const [newItemName, setNewItemName]         = useState("");
  const [newItemAmount, setNewItemAmount]     = useState("");
  const [newItemCategory, setNewItemCategory] = useState("Other");
  const [pickingFor, setPickingFor]           = useState(null);
  const [viewingRecipe, setViewingRecipe]     = useState(null);
  const [viewScale, setViewScale]             = useState(null);
  const [showAddRecipe, setShowAddRecipe]     = useState(false);
  const [editingRecipe, setEditingRecipe]     = useState(null);
  const [recipeSearch, setRecipeSearch]       = useState("");
  const [activeTag, setActiveTag]             = useState(null);

  // Check for shared recipe link
  const urlParams   = new URLSearchParams(window.location.search);
  const shareId     = urlParams.get("recipe");

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>setSession(session));
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_,session)=>{
      setSession(session);
      if (!session) { setRecipes([]); setMealPlan({}); setCheckedItems({}); setManualItems([]); setDbLoaded(false); }
    });
    return ()=>subscription.unsubscribe();
  },[]);

  // ── Load from Supabase ────────────────────────────────────────────────────
  useEffect(()=>{
    if (!session) return;
    const uid=session.user.id;
    (async()=>{
      try {
        const [{data:rData},{data:mData},{data:sData}] = await Promise.all([
          supabase.from("recipes").select("*").eq("user_id",uid),
          supabase.from("meal_plans").select("*").eq("user_id",uid).single(),
          supabase.from("shopping_items").select("*").eq("user_id",uid).single(),
        ]);
        if (rData) setRecipes(rData.map(r=>({...r.data,_dbId:r.id,_shareId:r.share_id,_isPublic:r.is_public})));
        if (mData) setMealPlan(mData.data||{});
        if (sData) { setCheckedItems(sData.data?.checkedItems||{}); setManualItems(sData.data?.manualItems||[]); }
      } catch {}
      setDbLoaded(true);
    })();
  },[session]);

  // ── Save helpers ──────────────────────────────────────────────────────────
  const saveRecipes = async (newRecipes) => {
    if (!session) return;
    setSaving(true);
    const uid=session.user.id;
    const authorName = session.user.user_metadata?.full_name||session.user.email;
    await supabase.from("recipes").delete().eq("user_id",uid);
    if (newRecipes.length>0) {
      const rows = newRecipes.map(r=>({
        id: r.id,
        user_id: uid,
        data: r,
        is_public: r.isPublic||false,
        share_id: r._shareId||generateId(),
        author_name: authorName,
      }));
      await supabase.from("recipes").insert(rows);
    }
    setSaving(false);
  };

  const saveMealPlan   = async (p)=>{if (!session)return; await supabase.from("meal_plans").upsert({user_id:session.user.id,data:p});};
  const saveShopping   = async (c,m)=>{if (!session)return; await supabase.from("shopping_items").upsert({user_id:session.user.id,data:{checkedItems:c,manualItems:m}});};

  // ── Shopping ──────────────────────────────────────────────────────────────
  const parseAmount = (str)=>{ if (!str)return null; const m=str.trim().match(/^([\d.,]+)\s*([a-zA-Z%]*)$/); if (!m)return null; const v=parseFloat(m[1].replace(",",".")); return isNaN(v)?null:{value:v,unit:m[2].toLowerCase()}; };
  const combineAmounts = (amounts)=>{ if (amounts.length===1)return amounts[0]; const parsed=amounts.map(parseAmount); const ok=parsed.every((p,_,a)=>p&&p.unit===a[0]?.unit); if (ok&&parsed[0]){const total=parsed.reduce((s,p)=>s+p.value,0); const d=Number.isInteger(total)?total:parseFloat(total.toFixed(2)); return `${d}${parsed[0].unit||""}`;} return amounts.join(" + "); };

  const shoppingList = (()=>{ const map={}; Object.values(mealPlan).forEach(slots=>{ Object.values(slots).forEach(rid=>{ const recipe=recipes.find(r=>r.id===rid); if (!recipe)return; recipe.ingredients.forEach(({name,amount})=>{ const key=name.toLowerCase().trim(); if (!map[key])map[key]={name,amounts:[],recipeNames:[],category:guessCategory(name)}; map[key].amounts.push(amount); if (!map[key].recipeNames.includes(recipe.name))map[key].recipeNames.push(recipe.name); }); }); }); return Object.values(map).map(item=>({...item,combinedAmount:combineAmounts(item.amounts)})); })();

  const byCategory=(list,getKey)=>SHOP_CATEGORIES.reduce((acc,cat)=>{const items=list.filter(i=>(getKey(i)||"Other")===cat); if (items.length)acc[cat]=items; return acc;},{});
  const shopByCat  = byCategory(shoppingList,i=>i.category);
  const manualByCat= byCategory(manualItems, i=>i.category);
  const usedCats   = SHOP_CATEGORIES.filter(c=>shopByCat[c]||manualByCat[c]);

  // ── Recipe actions ────────────────────────────────────────────────────────
  const saveNew = (r) => {
    const withId={...r,id:generateId(),_shareId:generateId()};
    const updated=[...recipes,withId];
    setRecipes(updated); saveRecipes(updated); setShowAddRecipe(false);
  };

  const saveEdited = (r) => {
    const updated=recipes.map(x=>x.id===r.id?r:x);
    setRecipes(updated); saveRecipes(updated);
    if (viewingRecipe?.id===r.id) setViewingRecipe(r);
    setEditingRecipe(null);
  };

  const deleteRecipe = (id) => {
    const updated=recipes.filter(r=>r.id!==id);
    setRecipes(updated); saveRecipes(updated);
    const newPlan={...mealPlan};
    Object.keys(newPlan).forEach(d=>Object.keys(newPlan[d]||{}).forEach(s=>{if(newPlan[d][s]===id)delete newPlan[d][s];}));
    setMealPlan(newPlan); saveMealPlan(newPlan);
    if (viewingRecipe?.id===id) setViewingRecipe(null);
  };

  const copyShareLink = (recipe) => {
    const shareId = recipe._shareId||recipe.id;
    navigator.clipboard.writeText(`${window.location.origin}/?recipe=${shareId}`);
    setShareToast("Link copied!");
    setTimeout(()=>setShareToast(""),2500);
  };

  const addCommunityRecipe = async (recipeData) => {
    const copy={...recipeData,id:generateId(),_shareId:generateId(),isPublic:false};
    const updated=[...recipes,copy];
    setRecipes(updated); saveRecipes(updated);
  };

  const assignMeal=(day,slot,rid)=>{const p={...mealPlan,[day]:{...(mealPlan[day]||{}),[slot]:rid}};setMealPlan(p);saveMealPlan(p);setPickingFor(null);setRecipeSearch("");};
  const removeMeal=(day,slot)=>{const p={...mealPlan};if(p[day])delete p[day][slot];setMealPlan(p);saveMealPlan(p);};
  const toggleCheck=(key)=>{const u={...checkedItems,[key]:!checkedItems[key]};setCheckedItems(u);saveShopping(u,manualItems);};
  const clearChecked=()=>{setCheckedItems({});saveShopping({},manualItems);};
  const addManualItem=()=>{const name=newItemName.trim();if(!name)return;const u=[...manualItems,{id:generateId(),name,amount:newItemAmount.trim(),category:newItemCategory}];setManualItems(u);saveShopping(checkedItems,u);setNewItemName("");setNewItemAmount("");setNewItemCategory("Other");};
  const deleteManualItem=(id)=>{const u=manualItems.filter(i=>i.id!==id);setManualItems(u);saveShopping(checkedItems,u);};

  const allTags  = [...new Set(recipes.flatMap(r=>r.tags||[]))];
  const filtered = recipes.filter(r=>{
    const ms=r.name.toLowerCase().includes(recipeSearch.toLowerCase());
    const mt=!activeTag||(r.tags||[]).includes(activeTag);
    return ms&&mt;
  });

  const signOut = async ()=>{ await supabase.auth.signOut(); };

  // ── Render guards ─────────────────────────────────────────────────────────
  if (session===undefined) return <Centered>Loading…</Centered>;

  // Show shared recipe page (works even when logged out)
  if (shareId) return <SharedRecipePage shareId={shareId} onBack={()=>window.location.href="/"}/>;

  if (!session) return <AuthScreen/>;
  if (!dbLoaded) return <Centered>Loading your data…</Centered>;

  const userName = session.user.user_metadata?.full_name||session.user.email;
  const myRecipeIds = recipes.map(r=>r.id);

  return (
    <div style={{fontFamily:"'Georgia',serif",minHeight:"100vh",background:"#faf8f4",color:"#2c2416"}}>

      {/* Toast notification */}
      {shareToast&&(
        <div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:"#2c2416",color:"#faf8f4",padding:"10px 20px",borderRadius:20,fontSize:13,zIndex:999,boxShadow:"0 4px 12px rgba(0,0,0,0.2)"}}>
          🔗 {shareToast}
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header style={{background:"#2c2416",color:"#faf8f4",padding:"14px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
        <div>
          <div style={{fontSize:20,fontWeight:"bold",letterSpacing:1}}>🥄 MealKeeper</div>
          <div style={{fontSize:11,opacity:0.5,marginTop:1}}>Plan. Shop. Cook.</div>
        </div>
        <nav style={{display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}>
          {[["planner","📅 Planner"],["recipes","📖 Recipes"],["shopping",`🛒 Shopping${shoppingList.length+manualItems.length?` (${shoppingList.length+manualItems.length})`:""}`],["community","🌍 Community"]].map(([key,label])=>(
            <button key={key} onClick={()=>setTab(key)} style={{background:tab===key?"#e8a020":"transparent",color:tab===key?"#2c2416":"#faf8f4",border:"1px solid "+(tab===key?"#e8a020":"rgba(255,255,255,0.2)"),borderRadius:6,padding:"7px 14px",cursor:"pointer",fontSize:13,fontWeight:tab===key?"bold":"normal"}}>{label}</button>
          ))}
          <div style={{display:"flex",alignItems:"center",gap:10,marginLeft:8,paddingLeft:12,borderLeft:"1px solid rgba(255,255,255,0.15)"}}>
            <span style={{fontSize:12,opacity:0.7}}>👤 {userName}</span>
            {saving&&<span style={{fontSize:11,opacity:0.5}}>Saving…</span>}
            <button onClick={signOut} style={{background:"none",border:"1px solid rgba(255,255,255,0.3)",borderRadius:6,color:"#faf8f4",padding:"5px 12px",cursor:"pointer",fontSize:12}}>Log out</button>
          </div>
        </nav>
      </header>

      <main style={{maxWidth:1040,margin:"0 auto",padding:"28px 20px"}}>

        {/* ── PLANNER ──────────────────────────────────────────────────────── */}
        {tab==="planner"&&(
          <div>
            <h2 style={{margin:"0 0 20px",fontSize:20}}>Weekly Meal Plan</h2>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:10}}>
              {DAYS.map(day=>(
                <div key={day} style={{background:"#fff",borderRadius:10,border:"1px solid #e8e0d0",overflow:"hidden"}}>
                  <div style={{background:"#2c2416",color:"#faf8f4",padding:"8px 10px",fontSize:12,fontWeight:"bold",textAlign:"center"}}>{day.slice(0,3).toUpperCase()}</div>
                  {SLOTS.map(slot=>{
                    const rid=mealPlan[day]?.[slot];
                    const recipe=recipes.find(r=>r.id===rid);
                    return (
                      <div key={slot} style={{padding:"8px",borderBottom:"1px solid #f0ead8",minHeight:70}}>
                        <div style={{fontSize:9,fontWeight:"bold",color:"#999",marginBottom:4,textTransform:"uppercase"}}>{slot}</div>
                        {recipe?(
                          <div style={{background:"#fef3e2",borderRadius:6,padding:"5px 6px",fontSize:11,cursor:"pointer"}} onClick={()=>{setViewingRecipe(recipe);setViewScale(null);}}>
                            {recipe.photo?<img src={recipe.photo} alt="" style={{width:"100%",height:36,objectFit:"cover",borderRadius:4,marginBottom:3}}/>:<div style={{fontSize:18,textAlign:"center"}}>{recipe.emoji}</div>}
                            <div style={{fontWeight:"bold",fontSize:10,textAlign:"center",lineHeight:1.2}}>{recipe.name}</div>
                            <button onClick={e=>{e.stopPropagation();removeMeal(day,slot);}} style={{marginTop:4,width:"100%",background:"none",border:"none",color:"#c0392b",fontSize:10,cursor:"pointer"}}>✕ remove</button>
                          </div>
                        ):(
                          <button onClick={()=>setPickingFor({day,slot})} style={{width:"100%",height:52,background:"none",border:"1.5px dashed #d0c8b8",borderRadius:6,color:"#b0a898",fontSize:11,cursor:"pointer"}}>+ Add</button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── RECIPES ──────────────────────────────────────────────────────── */}
        {tab==="recipes"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
              <h2 style={{margin:0,fontSize:20}}>My Recipes <span style={{fontSize:14,color:"#aaa",fontWeight:"normal"}}>({filtered.length})</span></h2>
              <button onClick={()=>setShowAddRecipe(true)} style={{background:"#e8a020",color:"#2c2416",border:"none",borderRadius:8,padding:"10px 18px",fontWeight:"bold",cursor:"pointer",fontSize:14}}>+ Add Recipe</button>
            </div>
            <input value={recipeSearch} onChange={e=>setRecipeSearch(e.target.value)} placeholder="🔍  Search recipes…" style={{width:"100%",padding:"10px 14px",border:"1px solid #ddd",borderRadius:10,fontSize:14,boxSizing:"border-box",marginBottom:12}}/>
            {allTags.length>0&&(
              <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:18}}>
                <span onClick={()=>setActiveTag(null)} style={{background:!activeTag?"#2c2416":"#f0ead8",color:!activeTag?"#faf8f4":"#6a5a40",borderRadius:20,padding:"4px 12px",fontSize:12,cursor:"pointer"}}>All</span>
                {allTags.map(t=><span key={t} onClick={()=>setActiveTag(activeTag===t?null:t)} style={{background:activeTag===t?"#2c2416":"#f0ead8",color:activeTag===t?"#faf8f4":"#6a5a40",borderRadius:20,padding:"4px 12px",fontSize:12,cursor:"pointer"}}>{t}</span>)}
              </div>
            )}
            {filtered.length===0&&<p style={{color:"#999",textAlign:"center",padding:"40px 0"}}>No recipes found.</p>}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:16}}>
              {filtered.map(recipe=>(
                <div key={recipe.id} style={{background:"#fff",borderRadius:12,border:"1px solid #e8e0d0",overflow:"hidden",display:"flex",flexDirection:"column"}}>
                  {recipe.photo?<img src={recipe.photo} alt={recipe.name} style={{width:"100%",height:150,objectFit:"cover"}}/>:<div style={{background:"#fef3e2",padding:"20px",textAlign:"center",fontSize:44}}>{recipe.emoji}</div>}
                  <div style={{padding:"12px 14px",flex:1,display:"flex",flexDirection:"column"}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                      <div style={{fontWeight:"bold",fontSize:15,flex:1}}>{recipe.name}</div>
                      {recipe.isPublic&&<span style={{fontSize:10,background:"#e8f5e9",color:"#27ae60",borderRadius:10,padding:"2px 7px",border:"1px solid #c8e6c9",whiteSpace:"nowrap"}}>🌍 Public</span>}
                    </div>
                    <div style={{fontSize:12,color:"#888",marginBottom:8}}>
                      Serves {recipe.servings}
                      {recipe.prepTime&&` · 🕐 ${recipe.prepTime}`}
                      {recipe.cookTime&&` · 🍳 ${recipe.cookTime}`}
                    </div>
                    {(recipe.tags||[]).length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:10}}>{recipe.tags.map(t=><span key={t} style={{background:"#f0ead8",color:"#6a5a40",borderRadius:20,padding:"2px 8px",fontSize:11}}>{t}</span>)}</div>}
                    <div style={{marginTop:"auto",display:"flex",flexDirection:"column",gap:6}}>
                      <button onClick={()=>{setViewingRecipe(recipe);setViewScale(null);}} style={{width:"100%",background:"#fef3e2",border:"1px solid #e8c870",borderRadius:6,padding:"7px",color:"#2c2416",fontSize:12,cursor:"pointer",fontWeight:"bold"}}>📋 View Recipe</button>
                      <div style={{display:"flex",gap:6}}>
                        <button onClick={()=>setEditingRecipe(JSON.parse(JSON.stringify(recipe)))} style={{flex:1,background:"#f0f0ff",border:"1px solid #c0c0e8",borderRadius:6,padding:"6px",color:"#3a3080",fontSize:12,cursor:"pointer"}}>✏️ Edit</button>
                        <button onClick={()=>copyShareLink(recipe)} style={{flex:1,background:"#f0fff4",border:"1px solid #9dc",borderRadius:6,padding:"6px",color:"#1a7a40",fontSize:12,cursor:"pointer"}}>🔗 Share</button>
                        <button onClick={()=>deleteRecipe(recipe.id)} style={{flex:1,background:"none",border:"1px solid #e0d0c0",borderRadius:6,padding:"6px",color:"#c0392b",fontSize:12,cursor:"pointer"}}>🗑</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SHOPPING ─────────────────────────────────────────────────────── */}
        {tab==="shopping"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <h2 style={{margin:0,fontSize:20}}>Shopping List</h2>
              {Object.values(checkedItems).some(Boolean)&&<button onClick={clearChecked} style={{background:"none",border:"1px solid #ccc",borderRadius:6,padding:"6px 12px",fontSize:12,cursor:"pointer",color:"#666"}}>Clear checked</button>}
            </div>
            <div style={{background:"#fff",border:"1px solid #e8e0d0",borderRadius:10,padding:"14px 16px",marginBottom:28}}>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <input value={newItemName} onChange={e=>setNewItemName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addManualItem()} placeholder="Add an item…" style={{flex:"2 1 160px",padding:"9px 12px",border:"1px solid #ddd",borderRadius:8,fontSize:14}}/>
                <input value={newItemAmount} onChange={e=>setNewItemAmount(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addManualItem()} placeholder="Amount (optional)" style={{flex:"1 1 100px",padding:"9px 12px",border:"1px solid #ddd",borderRadius:8,fontSize:14}}/>
                <select value={newItemCategory} onChange={e=>setNewItemCategory(e.target.value)} style={{flex:"1 1 120px",padding:"9px 10px",border:"1px solid #ddd",borderRadius:8,fontSize:13,background:"#faf8f4"}}>
                  {SHOP_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
                <button onClick={addManualItem} style={{background:"#e8a020",color:"#2c2416",border:"none",borderRadius:8,padding:"9px 18px",fontWeight:"bold",cursor:"pointer",fontSize:14}}>+ Add</button>
              </div>
            </div>
            {usedCats.length===0&&<div style={{textAlign:"center",padding:"48px 20px",color:"#999"}}><div style={{fontSize:48,marginBottom:12}}>🛒</div><div style={{fontSize:16}}>Your shopping list is empty.</div><div style={{fontSize:13,marginTop:8}}>Add items above, or plan meals to auto-populate.</div></div>}
            {usedCats.map(cat=>(
              <div key={cat} style={{marginBottom:24}}>
                <div style={{fontSize:11,fontWeight:"bold",color:"#888",textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>{cat}</div>
                <div style={{background:"#fff",borderRadius:12,border:"1px solid #e8e0d0",overflow:"hidden"}}>
                  {(shopByCat[cat]||[]).map((item,i,arr)=>{
                    const key="recipe_"+item.name.toLowerCase(); const checked=!!checkedItems[key]; const last=i===arr.length-1&&!(manualByCat[cat]||[]).length;
                    return <div key={key} onClick={()=>toggleCheck(key)} style={{display:"flex",alignItems:"center",gap:14,padding:"13px 18px",borderBottom:last?"none":"1px solid #f0ead8",cursor:"pointer",background:checked?"#f9f9f9":"#fff"}}><Checkbox checked={checked}/><div style={{flex:1,textDecoration:checked?"line-through":"none",color:checked?"#aaa":"#2c2416"}}><span style={{fontWeight:500}}>{item.name}</span><span style={{color:"#777",fontSize:13,marginLeft:10}}>{item.combinedAmount}</span>{item.amounts.length>1&&<span style={{color:"#bbb",fontSize:11,marginLeft:6}}>({item.amounts.join(" + ")})</span>}</div><div style={{fontSize:11,color:"#bbb",textAlign:"right"}}>{item.recipeNames.join(" · ")}</div></div>;
                  })}
                  {(manualByCat[cat]||[]).map((item,i,arr)=>{
                    const key="manual_"+item.id; const checked=!!checkedItems[key];
                    return <div key={item.id} style={{display:"flex",alignItems:"center",gap:14,padding:"13px 18px",borderBottom:i<arr.length-1?"1px solid #f0ead8":"none",background:checked?"#f9f9f9":"#fff"}}><div onClick={()=>toggleCheck(key)} style={{cursor:"pointer"}}><Checkbox checked={checked}/></div><div onClick={()=>toggleCheck(key)} style={{flex:1,cursor:"pointer",textDecoration:checked?"line-through":"none",color:checked?"#aaa":"#2c2416"}}><span style={{fontWeight:500}}>{item.name}</span>{item.amount&&<span style={{color:"#777",fontSize:13,marginLeft:10}}>{item.amount}</span>}</div><button onClick={()=>deleteManualItem(item.id)} style={{background:"none",border:"none",color:"#ccc",fontSize:18,cursor:"pointer",padding:"0 4px"}}>×</button></div>;
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── COMMUNITY ────────────────────────────────────────────────────── */}
        {tab==="community"&&(
          <CommunityTab myRecipeIds={myRecipeIds} onAddToMine={addCommunityRecipe}/>
        )}
      </main>

      {/* ── RECIPE PICKER ──────────────────────────────────────────────────── */}
      {pickingFor&&(
        <Modal onClose={()=>{setPickingFor(null);setRecipeSearch("");}}>
          <div style={{padding:24,width:420,maxHeight:"72vh",overflowY:"auto"}}>
            <h3 style={{margin:"0 0 4px"}}>Choose a Recipe</h3>
            <p style={{margin:"0 0 12px",color:"#888",fontSize:13}}>{pickingFor.day} — {pickingFor.slot}</p>
            <input placeholder="🔍  Search…" value={recipeSearch} onChange={e=>setRecipeSearch(e.target.value)} style={{width:"100%",padding:"8px 12px",border:"1px solid #ddd",borderRadius:8,fontSize:13,boxSizing:"border-box",marginBottom:12}}/>
            {filtered.map(recipe=>(
              <div key={recipe.id} onClick={()=>assignMeal(pickingFor.day,pickingFor.slot,recipe.id)} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",borderRadius:8,border:"1px solid #e8e0d0",marginBottom:8,cursor:"pointer",background:"#faf8f4"}} onMouseEnter={e=>e.currentTarget.style.background="#fef3e2"} onMouseLeave={e=>e.currentTarget.style.background="#faf8f4"}>
                {recipe.photo?<img src={recipe.photo} alt="" style={{width:42,height:42,objectFit:"cover",borderRadius:6}}/>:<span style={{fontSize:28}}>{recipe.emoji}</span>}
                <div><div style={{fontWeight:"bold",fontSize:14}}>{recipe.name}</div><div style={{fontSize:12,color:"#888"}}>Serves {recipe.servings}{recipe.prepTime&&` · ${recipe.prepTime} prep`}</div></div>
              </div>
            ))}
            {filtered.length===0&&<p style={{color:"#999",textAlign:"center"}}>No recipes found.</p>}
          </div>
        </Modal>
      )}

      {/* ── VIEW RECIPE ────────────────────────────────────────────────────── */}
      {viewingRecipe&&!editingRecipe&&(
        <Modal onClose={()=>setViewingRecipe(null)}>
          <div style={{width:540,maxHeight:"90vh",overflowY:"auto"}}>
            {viewingRecipe.photo?<img src={viewingRecipe.photo} alt={viewingRecipe.name} style={{width:"100%",height:200,objectFit:"cover",borderRadius:"14px 14px 0 0"}}/>:<div style={{background:"#2c2416",padding:"28px",borderRadius:"14px 14px 0 0",textAlign:"center",fontSize:56}}>{viewingRecipe.emoji}</div>}
            <div style={{padding:"20px 28px"}}>
              <div style={{fontSize:22,fontWeight:"bold"}}>{viewingRecipe.name}</div>
              <div style={{fontSize:13,color:"#888",marginTop:4}}>Serves {viewingRecipe.servings}{viewingRecipe.prepTime&&` · 🕐 ${viewingRecipe.prepTime}`}{viewingRecipe.cookTime&&` · 🍳 ${viewingRecipe.cookTime}`}</div>
              {(viewingRecipe.tags||[]).length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:8}}>{viewingRecipe.tags.map(t=><span key={t} style={{background:"#f0ead8",color:"#6a5a40",borderRadius:20,padding:"3px 10px",fontSize:12}}>{t}</span>)}</div>}
              <ScaleControl baseServings={viewingRecipe.servings} onScale={v=>setViewScale(v)}/>
              <div style={{marginBottom:20,marginTop:18}}>
                <h3 style={{margin:"0 0 10px",fontSize:12,textTransform:"uppercase",letterSpacing:1,color:"#888"}}>Ingredients</h3>
                {viewingRecipe.ingredients.map((ing,i)=>{
                  const factor=(viewScale||viewingRecipe.servings)/viewingRecipe.servings;
                  return <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #f0ead8",fontSize:14}}><span>{ing.name}</span><span style={{color:"#555",fontWeight:"bold"}}>{scaleAmount(ing.amount,factor)}</span></div>;
                })}
              </div>
              <div style={{marginBottom:20}}>
                <h3 style={{margin:"0 0 10px",fontSize:12,textTransform:"uppercase",letterSpacing:1,color:"#888"}}>Method</h3>
                {viewingRecipe.method?viewingRecipe.method.split("\n").map((line,i)=>line.trim()?<p key={i} style={{margin:"0 0 10px",fontSize:14,lineHeight:1.8}}>{line}</p>:null):<p style={{color:"#bbb",fontSize:13,fontStyle:"italic"}}>No instructions added yet.</p>}
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>setEditingRecipe(JSON.parse(JSON.stringify(viewingRecipe)))} style={{flex:1,padding:"11px",border:"1px solid #c0c0e8",borderRadius:8,background:"#f0f0ff",color:"#3a3080",fontWeight:"bold",cursor:"pointer",fontSize:14}}>✏️ Edit</button>
                <button onClick={()=>copyShareLink(viewingRecipe)} style={{flex:1,padding:"11px",border:"1px solid #9dc",borderRadius:8,background:"#f0fff4",color:"#1a7a40",fontWeight:"bold",cursor:"pointer",fontSize:14}}>🔗 Share</button>
                <button onClick={()=>setViewingRecipe(null)} style={{flex:1,padding:"11px",border:"none",borderRadius:8,background:"#2c2416",color:"#faf8f4",fontWeight:"bold",cursor:"pointer",fontSize:14}}>Close</button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ── ADD / EDIT RECIPE ──────────────────────────────────────────────── */}
      {showAddRecipe&&<Modal onClose={()=>setShowAddRecipe(false)}><RecipeForm initial={{...BLANK_RECIPE}} title="New Recipe" onSave={saveNew} onCancel={()=>setShowAddRecipe(false)}/></Modal>}
      {editingRecipe&&<Modal onClose={()=>setEditingRecipe(null)}><RecipeForm initial={editingRecipe} title="Edit Recipe" onSave={saveEdited} onCancel={()=>setEditingRecipe(null)}/></Modal>}
    </div>
  );
}