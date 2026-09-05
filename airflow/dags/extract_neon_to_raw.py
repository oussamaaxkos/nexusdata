"""
DataFusion — Extract Neon Postgres tables into Azure Data Lake (raw layer)
----------------------------------------------------------------------------
For each business table, this DAG:
  1. Queries Neon Postgres
  2. Converts result to CSV
  3. Uploads CSV into the "raw" container in ADLS Gen2

Schedule: daily
"""

from datetime import datetime
from io import StringIO

import pandas as pd
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.providers.postgres.hooks.postgres import PostgresHook
from airflow.providers.microsoft.azure.hooks.wasb import WasbHook

TABLES = [
    "customers",
    "products",
    "orders",
    "order_items",
    "payments",
    "shipments",
]

CONTAINER_NAME = "raw"
POSTGRES_CONN_ID = "neon_postgres"
AZURE_CONN_ID = "azure_data_lake"


def extract_and_upload(table_name: str, **context):
    # 1. Extract from Neon
    pg_hook = PostgresHook(postgres_conn_id=POSTGRES_CONN_ID)
    df = pg_hook.get_pandas_df(sql=f"SELECT * FROM {table_name}")

    # 2. Convert to CSV in memory
    csv_buffer = StringIO()
    df.to_csv(csv_buffer, index=False)
    csv_data = csv_buffer.getvalue()

    # 3. Upload to Azure Blob Storage (raw container)
    execution_date = context["ds"]  # e.g. "2026-09-05"
    blob_name = f"{table_name}/{execution_date}/{table_name}.csv"

    wasb_hook = WasbHook(wasb_conn_id=AZURE_CONN_ID)
    wasb_hook.upload(
        container_name=CONTAINER_NAME,
        blob_name=blob_name,
        data=csv_data,
        overwrite=True,
    )

    print(f"Uploaded {len(df)} rows from '{table_name}' to raw/{blob_name}")


with DAG(
    dag_id="extract_neon_to_raw",
    description="Extract Neon Postgres tables and load into ADLS raw layer",
    start_date=datetime(2026, 1, 1),
    schedule_interval="@daily",
    catchup=False,
    tags=["datafusion", "ingestion", "raw"],
) as dag:

    for table in TABLES:
        PythonOperator(
            task_id=f"extract_{table}",
            python_callable=extract_and_upload,
            op_kwargs={"table_name": table},
        )
