"""
DataFusion — Enterprise Data Generator
----------------------------------------
Generates realistic customers, products, orders, order_items, payments,
and shipments, and loads them into Postgres (Neon).

Run:
    python ingestion/postgres/generate_data.py
"""

import os
import random
from datetime import datetime, timedelta

from dotenv import load_dotenv
from faker import Faker
from sqlalchemy import create_engine, text

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL not found. Check your .env file.")

fake = Faker()
Faker.seed(42)
random.seed(42)

N_CUSTOMERS = 500
N_PRODUCTS = 100
N_ORDERS = 2000
MAX_ITEMS_PER_ORDER = 5

PRODUCT_CATEGORIES = [
    "Electronics", "Clothing", "Home & Kitchen", "Books",
    "Sports & Outdoors", "Beauty", "Toys", "Groceries",
]

ORDER_STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"]
PAYMENT_METHODS = ["credit_card", "paypal", "bank_transfer", "debit_card"]
SHIPPING_CARRIERS = ["DHL", "FedEx", "UPS", "Local Courier"]
SHIPMENT_STATUSES = ["preparing", "in_transit", "delivered", "returned"]

engine = create_engine(DATABASE_URL)


# ---------------------------------------------------------------------------
# Generators
# ---------------------------------------------------------------------------

def generate_customers(n):
    customers = []
    for _ in range(n):
        signup_date = fake.date_between(start_date="-3y", end_date="today")
        customers.append({
            "first_name": fake.first_name(),
            "last_name": fake.last_name(),
            "email": fake.unique.email(),
            "country": fake.country(),
            "signup_date": signup_date,
        })
    return customers


def generate_products(n):
    products = []
    for _ in range(n):
        products.append({
            "product_name": fake.unique.catch_phrase(),
            "category": random.choice(PRODUCT_CATEGORIES),
            "price": round(random.uniform(5, 500), 2),
        })
    return products


def generate_orders_and_children(n_orders, customer_ids, product_rows):
    """
    product_rows: list of (product_id, price) tuples, needed to compute
    realistic order_item unit prices.
    """
    orders = []
    order_items = []
    payments = []
    shipments = []

    for i in range(1, n_orders + 1):
        customer_id = random.choice(customer_ids)
        order_date = fake.date_between(start_date="-2y", end_date="today")
        status = random.choices(
            ORDER_STATUSES, weights=[10, 15, 20, 45, 10]
        )[0]

        orders.append({
            "order_id": i,
            "customer_id": customer_id,
            "order_date": order_date,
            "status": status,
        })

        # --- order items ---
        n_items = random.randint(1, MAX_ITEMS_PER_ORDER)
        chosen_products = random.sample(product_rows, k=min(n_items, len(product_rows)))
        order_total = 0

        for product_id, price in chosen_products:
            quantity = random.randint(1, 4)
            unit_price = price
            order_items.append({
                "order_id": i,
                "product_id": product_id,
                "quantity": quantity,
                "unit_price": unit_price,
            })
            order_total += quantity * unit_price

        # --- payment (skip for cancelled/pending orders sometimes, for realism) ---
        if status != "cancelled":
            payment_date = order_date + timedelta(days=random.randint(0, 2))
            payments.append({
                "order_id": i,
                "payment_date": payment_date,
                "amount": round(order_total, 2),
                "method": random.choice(PAYMENT_METHODS),
            })

        # --- shipment (only if shipped/delivered) ---
        if status in ("shipped", "delivered"):
            ship_date = order_date + timedelta(days=random.randint(1, 5))
            shipments.append({
                "order_id": i,
                "ship_date": ship_date,
                "carrier": random.choice(SHIPPING_CARRIERS),
                "status": "delivered" if status == "delivered" else random.choice(SHIPMENT_STATUSES),
            })

    return orders, order_items, payments, shipments


# ---------------------------------------------------------------------------
# Load into Postgres
# ---------------------------------------------------------------------------

def insert_rows(conn, table, rows):
    if not rows:
        return
    columns = rows[0].keys()
    col_names = ", ".join(columns)
    placeholders = ", ".join(f":{c}" for c in columns)
    stmt = text(f"INSERT INTO {table} ({col_names}) VALUES ({placeholders})")
    conn.execute(stmt, rows)


def main():
    print("Connecting to database...")
    with engine.begin() as conn:
        print("Clearing existing data (if any)...")
        for table in ["shipments", "payments", "order_items", "orders", "products", "customers"]:
            conn.execute(text(f"TRUNCATE TABLE {table} RESTART IDENTITY CASCADE"))

        print(f"Generating {N_CUSTOMERS} customers...")
        customers = generate_customers(N_CUSTOMERS)
        insert_rows(conn, "customers", customers)

        customer_ids = [row[0] for row in conn.execute(
            text("SELECT customer_id FROM customers")
        ).fetchall()]

        print(f"Generating {N_PRODUCTS} products...")
        products = generate_products(N_PRODUCTS)
        insert_rows(conn, "products", products)

        product_rows = [
            (row[0], float(row[1])) for row in conn.execute(
                text("SELECT product_id, price FROM products")
            ).fetchall()
        ]

        print(f"Generating {N_ORDERS} orders + related order_items/payments/shipments...")
        orders, order_items, payments, shipments = generate_orders_and_children(
            N_ORDERS, customer_ids, product_rows
        )

        # orders include explicit order_id (SERIAL will still work since
        # we TRUNCATE ... RESTART IDENTITY beforehand and insert in order)
        insert_rows(conn, "orders", [
            {k: v for k, v in o.items() if k != "order_id"} for o in orders
        ])
        insert_rows(conn, "order_items", order_items)
        insert_rows(conn, "payments", payments)
        insert_rows(conn, "shipments", shipments)

        print("Done. Row counts:")
        for table in ["customers", "products", "orders", "order_items", "payments", "shipments"]:
            count = conn.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()
            print(f"  {table}: {count}")


if __name__ == "__main__":
    main()
