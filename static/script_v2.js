// happy 9 cooking - スクリプトファイル

const ingredientImageMap = {
    "ご飯": "rice",
    "卵": "egg",
    "ネギ": "green_onion",
    "玉ねぎ": "onion",
    "にんにく": "gerlic",
    "豚肉": "pork",
    "鶏肉": "chicken",
    "豆腐": "tofu",
    "わかめ": "wakame",
    "キムチ": "kimchi",
    "長ねぎ": "green_onion",
    "牛乳": "milk",
    "牛肉": "beef",
    "ほうれん草": "spanish",
    "にんじん": "carrot",
    "もやし": "bean sprout",
    "食パン": "white_bread",
    "バター": "butter",
    "麺": "noodles",
    "唐辛子": "pepper",
    "ライム": "lime",
    "ごぼう": "burdockroot",
    "小麦粉": "flour",
    "スパゲティ": "spaghetti",
    "ピーマン": "green pepper",
    "ソーセージ": "sausage",
    "キャベツ": "cabbage",
    "ナス": "eggplant",
    "じゃがいも": "potato",
    "きゅうり": "cucumber",
    "ハム": "ham",
    "鶏むね肉": "chicken breast",
    "パン粉": "breadcrumbs",
    "鶏もも肉": "chicken thigh",
    "合いびき肉": "ground_meat",
    "しょうが": "ginger",
    "片栗粉": "potato_starch",
    "カニカマ": "ham",
    "チーズ": "tofu",
    "アボカド": "cucumber",
    "トマト": "tomato_sauce",
    "カレー": "curry",
    "味噌": "miso",
    "醤油": "soy_sauce",
    "マヨネーズ": "mayonnaise",
    "ケチャップ": "ketchup",
    "ソース": "sauce",
    "ごま油": "sesame_oil",
    "コチュジャン": "gochujang",
    "魚醤": "fish_sauce",
    "油": "oil",
    "砂糖": "sugar",
    "カラメルソース": "caramel sauce",
    "バニラエッセンス": "vanilla_extract",
    "みりん": "mirin",
};

// 状態管理
let currentCategory = 'すべて';
let selectedIngredients = new Set();
let activeRecipeId = null;
let allIngredients = [];
let currentRecipes = [];

// 初期化処理
async function init() {
    await loadIngredients();
    await fetchRecipes();
}

// APIから食材を取得
async function loadIngredients() {
    const res = await fetch("/api/ingredients");
    allIngredients = await res.json();
    renderCategories();
    renderIngredients();
}

// カテゴリバーの描画
function renderCategories() {
    const categories = ['すべて', ...new Set(allIngredients.map(i => i.category))];
    const categoryBar = document.getElementById('categoryBar');

    categoryBar.innerHTML = categories.map(cat => `
        <button class="cat-btn ${currentCategory === cat ? 'active' : ''}" onclick="selectCategory('${cat}')">
            ${cat}
        </button>
    `).join('');
}

// 食材リストの描画
function renderIngredients() {
    const grid = document.getElementById('ingredientGrid');
    grid.innerHTML = '';

    const filtered = allIngredients.filter(ing => currentCategory === 'すべて' || ing.category === currentCategory);

    filtered.forEach(ing => {
        const isSelected = selectedIngredients.has(ing.name);
        const card = document.createElement('div');
        card.className = `ing-card ${isSelected ? 'selected' : ''}`;
        card.onclick = () => toggleIngredient(ing.name);

        card.innerHTML = `
            <div class="ing-img-wrapper">
                <img src="/static/images/ingredients/${ingredientImageMap[ing.name] || ing.name}.jpg"
                 alt="${ing.name}" onerror="this.src='https://placehold.co/60x60?text=No+Image'">
            </div>
            <div class="ing-label">${ing.name}</div>
        `;
        grid.appendChild(card);
    });

    renderTray();
}

// 選択中の食材トレイの更新
function renderTray() {
    const chipsContainer = document.getElementById('trayChips');
    if (selectedIngredients.size === 0) {
        chipsContainer.innerHTML = '<span class="empty-msg">食材を選択してください</span>';
        return;
    }

    chipsContainer.innerHTML = Array.from(selectedIngredients).map(name => `
        <span class="chip">${name}</span>
    `).join('');
}

// レシピをAPIから取得
async function fetchRecipes() {
    const res = await fetch("/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients: [...selectedIngredients] })
    });
    currentRecipes = await res.json();
    renderRecipes();
}

// レシピリストの描画
function renderRecipes() {
    const grid = document.getElementById('recipeGrid');
    grid.innerHTML = '';

    if (currentRecipes.length === 0) {
        grid.innerHTML = '<p class="empty-msg" style="grid-column: 1/-1; text-align: center; padding: 20px;">条件に合うレシピが見つかりませんでした。</p>';
        return;
    }

    currentRecipes.forEach(recipe => {
        const card = document.createElement('div');
        card.className = `recipe-card ${activeRecipeId === recipe.recipe_name ? 'active' : ''}`;
        card.onclick = () => selectRecipe(recipe.recipe_name);

        card.innerHTML = `
            <div class="recipe-img-wrapper">
                <img src="/static/images/recipes/${recipe.img_url.replace('.png', '.jpg')}" alt="" onerror="this.onerror=null; this.src='https://placehold.co/160x100?text=No+Image'">
            </div>
            <div class="recipe-label">${recipe.recipe_name}</div>
            <div class="recipe-time">⏱ ${recipe.cooking_time}分</div>
            <div class="recipe-match">${Math.round(recipe.match_percent * 100)}%</div>
        `;
        grid.appendChild(card);
    });
}

// カテゴリの切り替え
window.selectCategory = function(cat) {
    currentCategory = cat;
    renderCategories();
    renderIngredients();
};

// 食材の選択・解除トグル
window.toggleIngredient = function(name) {
    if (selectedIngredients.has(name)) {
        selectedIngredients.delete(name);
    } else {
        selectedIngredients.add(name);
    }
    renderIngredients();
    fetchRecipes();
};

// レシピの選択と詳細エリア更新
window.selectRecipe = function(name) {
    activeRecipeId = name;
    renderRecipes();

    const recipe = currentRecipes.find(r => r.recipe_name === name);
    const detailBox = document.getElementById('recipeDetail');

    const steps = recipe.instruction.split('。').filter(s => s.trim());

    detailBox.innerHTML = `
        <div class="detail-header">
            <h2 class="detail-title">${recipe.recipe_name}</h2>
            <span class="detail-time">調理時間: ${recipe.cooking_time}分</span>
        </div>
        <div class="detail-body">
            <div class="detail-left">
                <div class="detail-img-box">
                    <img src="/static/images/cooked_images/${recipe.img_url.replace(/\.(jpg|png)$/, '_cooked.jpg')}" alt="${recipe.recipe_name}" onerror="this.onerror=null; this.src='https://placehold.co/400x250?text=No+Image'">
                </div>
            </div>
            <div class="detail-right">
                <div class="ingredients-list-box">
                    <h3>持っている食材</h3>
                    <ul class="ing-list">
                        ${recipe.matched_ingredients.map(i => `<li><span>✓</span><span>${i}</span></li>`).join('')}
                    </ul>
                    ${recipe.missing_fresh.length > 0 ? `
                    <h3>足りない食材</h3>
                    <ul class="ing-list">
                        ${recipe.missing_fresh.map(i => `<li><span>✗</span><span>${i}</span></li>`).join('')}
                    </ul>` : ''}
                    ${recipe.seasonings.length > 0 ? `
                    <h3>調味料</h3>
                    <ul class="ing-list">
                        ${recipe.seasonings.map(i => `<li><span>🧂</span><span>${i}</span></li>`).join('')}
                    </ul>` : ''}
                </div>
                <div class="steps-box" style="margin-top: 20px;">
                    <h3>作り方</h3>
                    <ol class="step-list">
                        ${steps.map(s => `<li>${s}。</li>`).join('')}
                    </ol>
                </div>
            </div>
        </div>
    `;
};

// アプリ起動
init();