"""
DataFusion — Text-to-SQL API
------------------------------
Takes a plain-English question, turns it into SQL using Gemini,
runs it against the Databricks Gold layer, and returns the answer.
"""

import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from databricks import sql as databricks_sql
from google import genai

load_dotenv()

DATABRICKS_SERVER_HOSTNAME = os.getenv("DATABRICKS_SERVER_HOSTNAME")
DATABRICKS_HTTP_PATH = os.getenv("DATABRICKS_HTTP_PATH")
DATABRICKS_TOKEN = os.getenv("DATABRICKS_TOKEN")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

client = genai.Client(api_key=GEMINI_API_KEY)

app = FastAPI(title="DataFusion Text-to-SQL API")

# Schema description given to the model so it knows what it can query.
# Keep this in sync with your actual Gold tables.
GOLD_SCHEMA = """
You can only query these Unity Catalog Gold tables (catalog: datafusion_dev, schema: gold):

datafusion_dev.gold.monthly_revenue(month STRING, total_revenue DOUBLE, num_orders BIGINT)
datafusion_dev.gold.customer_summary(customer_id BIGINT, first_name STRING, last_name STRING, country STRING, total_orders BIGINT, total_spent DOUBLE, last_order_date DATE)
datafusion_dev.gold.top_products(product_id BIGINT, product_name STRING, category STRING, total_quantity_sold BIGINT, total_revenue DOUBLE)
datafusion_dev.gold.orders_by_status(status STRING, order_count BIGINT, avg_payment DOUBLE)
"""


class Question(BaseModel):
    question: str


def generate_sql(question: str) -> str:
    prompt = f"""You are a SQL generator for a Databricks Unity Catalog lakehouse.

{GOLD_SCHEMA}

Rules:
- Only generate SELECT statements. Never INSERT, UPDATE, DELETE, or DDL.
- Only use the tables and columns listed above.
- Return ONLY the raw SQL query, no explanation, no markdown formatting, no backticks.

Question: {question}

SQL:"""

    response = client.models.generate_content(
        model="gemini-3.6-flash",
        contents=prompt,
    )
    sql = response.text.strip()
    sql = sql.replace("```sql", "").replace("```", "").strip()
    return sql


def run_query(sql: str):
    # Basic safety check — only allow SELECT statements
    if not sql.strip().lower().startswith("select"):
        raise ValueError("Only SELECT queries are allowed.")

    with databricks_sql.connect(
        server_hostname=DATABRICKS_SERVER_HOSTNAME,
        http_path=DATABRICKS_HTTP_PATH,
        access_token=DATABRICKS_TOKEN,
    ) as conn:
        with conn.cursor() as cursor:
            cursor.execute(sql)
            columns = [desc[0] for desc in cursor.description]
            rows = cursor.fetchall()
            return columns, [list(row) for row in rows]


@app.get("/")
def root():
    return {"status": "DataFusion Text-to-SQL API is running"}


@app.post("/ask")
def ask(payload: Question):
    try:
        sql = generate_sql(payload.question)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SQL generation failed: {e}")

    try:
        columns, rows = run_query(sql)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Query failed: {e} | Generated SQL: {sql}")

    return {
        "question": payload.question,
        "generated_sql": sql,
        "columns": columns,
        "rows": rows,
    }
