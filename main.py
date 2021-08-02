#! ./venv python
import pickle

import pandas as pd
import uvicorn
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

app = FastAPI()
app.mount("/templates/assets", StaticFiles(directory="templates/assets"), name="static")

templates = Jinja2Templates(directory="templates")


@app.get("/", response_class=HTMLResponse)
async def get_index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.post("/predict")
async def predict(Customer_Age: int, Total_Relationship_Count: int, Total_Revolving_Bal: int,
                  Total_Amt_Chng_Q4_Q1: float, Total_Trans_Amt: int, Total_Trans_Ct: int, Total_Ct_Chng_Q4_Q1: float,
                  Avg_Utilization_Ratio: float):
    features = ['Customer_Age', 'Total_Relationship_Count',
                'Total_Revolving_Bal', 'Total_Amt_Chng_Q4_Q1',
                'Total_Trans_Amt', 'Total_Trans_Ct',
                'Total_Ct_Chng_Q4_Q1', 'Avg_Utilization_Ratio']

    model = pickle.load(open('creditCard_modelRFC.sav', 'rb'))

    # initialisation des données en list
    data = [[Customer_Age, Total_Relationship_Count, Total_Revolving_Bal, Total_Amt_Chng_Q4_Q1, Total_Trans_Amt, Total_Trans_Ct, Total_Ct_Chng_Q4_Q1, Avg_Utilization_Ratio]]

    # creer le DataFrame
    data = pd.DataFrame(data, columns=features)

    ypred = model.predict(data).tolist()

    return {"data": ypred[0]}
