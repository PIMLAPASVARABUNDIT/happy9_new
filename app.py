from flask import Flask, render_template, request, jsonify
import sqlite3

import os
import sys

# カレントディレクトリをこのスクリプトのパスに移動
dir = os.path.dirname(sys.argv[0])
if dir != "":
    os.chdir(dir)

app = Flask(__name__)
DB_PATH = "mydb.db"


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


@app.route("/")
def index():
    return render_template("recipe_search_v2.html")


@app.route("/recommend", methods=["POST"])
def recommend():
    data = request.get_json()
    user_ingredients = data.get("ingredients", [])

    conn = get_db()
    cur = conn.cursor()

    cur.execute("SELECT * FROM recipes")
    recipes = cur.fetchall()

    results = []
    for recipe in recipes:
        recipe_id = recipe["recipe_id"]

        cur.execute(
            """
            SELECT ingredients.ingredient_name, ingredients.ingredient_category, recipe_ingredients.is_essential
            FROM recipe_ingredients
            JOIN ingredients
            ON recipe_ingredients.ingredient_id = ingredients.ingredient_id
            WHERE recipe_ingredients.recipe_id = ?
        """,
            (recipe_id,),
        )

        ingredient_rows = cur.fetchall()

        all_ingredients = []
        fresh_ingredients = []
        matched = []
        missing_fresh = []
        seasonings = []
        essential_missing = []

        for r in ingredient_rows:
            ing_name = r["ingredient_name"]
            category = r["ingredient_category"]
            is_essential = r["is_essential"]

            all_ingredients.append(ing_name)

            if category != "調味料":
                fresh_ingredients.append(ing_name)

            if ing_name in user_ingredients:
                if category != "調味料":
                    matched.append(ing_name)

            else:
                if category == "調味料":
                    seasonings.append(ing_name)
                else:
                    missing_fresh.append(ing_name)
                if is_essential == 1:
                    essential_missing.append(ing_name)

        if len(essential_missing) > 0:
            continue

        if len(all_ingredients) == 0:
            continue

        match_percent = len(matched) / len(all_ingredients)

        if match_percent >= 0.4:
            results.append(
                {
                    "recipe_name": recipe["recipe_name"],
                    "cooking_time": recipe["cooking_time"],
                    "img_url": recipe["img_url"],
                    "instruction": recipe["instruction"],
                    "ingredients": all_ingredients,
                    "matched_ingredients": matched,
                    "missing_fresh": missing_fresh,
                    "seasonings": seasonings,
                    "match_percent": round(match_percent, 2),
                }
            )

    conn.close()

    results.sort(key=lambda x: x["match_percent"], reverse=True)

    return jsonify(results)


@app.route("/api/ingredients")
def api_ingredients():

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
    SELECT ingredient_id, ingredient_name, ingredient_category
    FROM ingredients
    WHERE ingredient_category != '調味料'
    """)

    rows = cur.fetchall()

    result = [
        {
            "id": r["ingredient_id"],
            "name": r["ingredient_name"],
            "category": r["ingredient_category"],
        }
        for r in rows
    ]

    conn.close()

    return jsonify(result)


@app.route("/api/recipes")
def api_recipes():

    conn = get_db()
    cur = conn.cursor()

    cur.execute("SELECT * FROM recipes")

    recipe_rows = cur.fetchall()

    results = []

    for recipe in recipe_rows:

        recipe_id = recipe["recipe_id"]

        cur.execute(
            """
            SELECT ingredients.ingredient_name
            FROM recipe_ingredients
            JOIN ingredients
            ON recipe_ingredients.ingredient_id = ingredients.ingredient_id
            WHERE recipe_ingredients.recipe_id = ?
        """,
            (recipe_id,),
        )

        ingredients = [r["ingredient_name"] for r in cur.fetchall()]

        results.append(
            {
                "id": recipe["recipe_id"],
                "name": recipe["recipe_name"],
                "time": recipe["cooking_time"],
                "instruction": recipe["instruction"],
                "image": recipe["img_url"],
                "ingredients": ingredients,
            }
        )

    conn.close()

    return jsonify(results)


if __name__ == "__main__":
    app.run(debug=True)
