import pickle
import os
import sqlite3
from io import StringIO
import pandas as pd
import numpy as np
import uvicorn
from fastapi import FastAPI, Request, UploadFile, File, Query
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from typing import List, Optional
from pydantic import BaseModel


class Item(BaseModel):
    columns: list = Query([])
    rows: list = Query([])


app = FastAPI()
app.mount("/templates/assets", StaticFiles(directory="templates/assets"), name="static")

templates = Jinja2Templates(directory="templates")

col = ['Customer_Age', 'Total_Relationship_Count',
       'Total_Revolving_Bal', 'Total_Amt_Chng_Q4_Q1',
       'Total_Trans_Amt', 'Total_Trans_Ct',
       'Total_Ct_Chng_Q4_Q1', 'Avg_Utilization_Ratio']


def prediction(features):
    # creer le DataFrame
    data = pd.DataFrame(features, columns=col)
    model = pickle.load(open('creditCard_modelRFC.sav', 'rb'))
    ypred = model.predict(data).tolist()
    return ypred


def get_data(query):
    sqliteConnection = None
    try:
        sqliteConnection = sqlite3.connect('DATABASE.sqlite3')
        cursor = sqliteConnection.cursor()
        print("Database created and Successfully Connected to SQLite")

        cursor.execute(query)
        data = cursor.fetchall()
        cursor.close()
        return data
    except sqlite3.Error as error:
        print("Error while connecting to sqlite", error)
    finally:
        if sqliteConnection:
            sqliteConnection.close()
            print("The SQLite connection is closed")


@app.get("/", response_class=HTMLResponse)
async def get_index(request: Request):
    return templates.TemplateResponse("home.html", {"request": request})


@app.get("/unique", response_class=HTMLResponse)
async def get_unique(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/db_search", response_class=HTMLResponse)
async def get_in_db(request: Request):
    query = "SELECT CLIENTNUM, Customer_Age, Total_Relationship_Count, Total_Revolving_Bal, " \
            "Total_Amt_Chng_Q4_Q1, Total_Trans_Amt, Total_Trans_Ct, Total_Ct_Chng_Q4_Q1, " \
            "Avg_Utilization_Ratio FROM CUSTOMERS ORDER BY random() LIMIT 200;"
    data = get_data(query)
    return templates.TemplateResponse("searchDb.html", {"request": request, "datas": data})


# @app.get("/import", response_class=HTMLResponse)
# async def get_in_file(request: Request):
#     return templates.TemplateResponse("import.html", {"request": request})


@app.post("/predict")
async def predict(Customer_Age: int, Total_Relationship_Count: int, Total_Revolving_Bal: int,
                  Total_Amt_Chng_Q4_Q1: float, Total_Trans_Amt: int, Total_Trans_Ct: int, Total_Ct_Chng_Q4_Q1: float,
                  Avg_Utilization_Ratio: float):
    # initialisation des données en list
    data = [[Customer_Age, Total_Relationship_Count, Total_Revolving_Bal, Total_Amt_Chng_Q4_Q1, Total_Trans_Amt,
             Total_Trans_Ct, Total_Ct_Chng_Q4_Q1, Avg_Utilization_Ratio]]

    ypred = prediction(data)
    return {"data": ypred[0]}


@app.get("/predict")
async def predict_group(search_count: int):
    _query = f"SELECT Customer_Age, Total_Relationship_Count, Total_Revolving_Bal, " \
             f"Total_Amt_Chng_Q4_Q1, Total_Trans_Amt, Total_Trans_Ct, Total_Ct_Chng_Q4_Q1, " \
             f"Avg_Utilization_Ratio, Attrition_Flag FROM CUSTOMERS ORDER BY random() LIMIT {search_count}; "
    data = get_data(_query)
    x_data = np.array(data)[:, :-1].tolist()
    ypred = prediction(x_data)

    return {'datas': data, 'pred': ypred}


@app.get("/select_predict")
async def selectPredict(searchID: str):
    searchID = np.array(searchID).tolist()
    print(searchID)
    _query = f"SELECT Customer_Age, Total_Relationship_Count, Total_Revolving_Bal, " \
             f"Total_Amt_Chng_Q4_Q1, Total_Trans_Amt, Total_Trans_Ct, Total_Ct_Chng_Q4_Q1, " \
             f"Avg_Utilization_Ratio, Attrition_Flag FROM CUSTOMERS WHERE CLIENTNUM in {searchID};"

    data = get_data(_query)
    if data:
        x_data = np.array(data)[:, :-1].tolist()
        ypred = prediction(x_data)
        return {'datas': data, 'pred': ypred}
    return {'datas': [], 'pred': []}


# @app.get("/file-upload", response_class=HTMLResponse)
# async def readFile(request: Request, file: UploadFile = File(...)):
#     ext = os.path.splitext(file.filename)[1]
#     data = []
#     if ext == '.csv':
#         df = pd.read_csv(StringIO(file.file.read().decode('utf-8')), sep=";")
#         data.append(df.columns.tolist())
#         data.append(df.values.tolist())
#         # print(df.head())
#     elif ext == '.xls' or ext == '.xlsx':
#         df = pd.read_excel(StringIO(file.file.read().decode('utf-8')), encoding='utf-8')
#     elif ext == '.txt':
#         df = pd.read_table(StringIO(file.file.read().decode('utf-8')), encoding='utf-8')
#     else:
#         return {'error': 'file extension is not supported'}
#     return templates.TemplateResponse("import.html", {"request": request, "datas": data})


@app.post("/file-upload")
async def readFile(file: UploadFile = File(...)):
    ext = os.path.splitext(file.filename)[1]
    data = []

    if ext == '.csv':
        df = pd.read_csv(StringIO(file.file.read().decode('utf-8')), sep=";")
        err = [c for c in col if c not in df.columns.tolist()]
        if len(err):
            return {'error': {'msg': "le fichier de données n'est pas compatible", 'details': err}}

    elif ext in ['.xls', '.xlsx']:
        df = pd.read_excel(StringIO(file.file.read().decode('utf-8')), encoding='utf-8')
        err = [c for c in col if c not in df.columns.tolist()]
        if len(err):
            return {'error': {'msg': "le fichier de données n'est pas compatible", 'details': err}}

    elif ext == '.txt':
        df = pd.read_table(StringIO(file.file.read().decode('utf-8')), encoding='utf-8')
        err = [c for c in col if c not in df.columns.tolist()]
        if len(err):
            return {'error': {'msg': "le fichier de données n'est pas compatible", 'details': err}}

    else:
        return {'error': {'msg': 'file extension is not supported', 'details': []}}

    data.append(df.columns.tolist())
    data.append(df.values.tolist())

    return {"datas": data}


@app.post("/file_predict")
async def filePredict(item: Item):

    item.columns.insert(0, "checkbox")
    df = pd.DataFrame(item.rows, columns=item.columns)

    ypred = prediction(df[col])

    return {'col': df[col].columns.tolist(), 'datas': df[col].values.tolist(), 'pred': ypred}

