# Deployment Guide — Zoom Clone (Docker + Azure)

## Local Development (No Docker)

```bash
# Terminal 1 — Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev
```

- Frontend: http://localhost:3000
- Backend API docs: http://localhost:8000/docs

---

## Local Docker Testing

```bash
# From the project root
docker-compose up --build

# Frontend → http://localhost:3000
# Backend  → http://localhost:8000
```

To run in detached mode:
```bash
docker-compose up --build -d
docker-compose logs -f   # view logs
docker-compose down      # stop
```

---

## Azure Deployment (Step-by-Step)

### Prerequisites
- Azure CLI installed: `az login`
- Docker Desktop installed
- A GitHub repo with this code pushed to the `main` branch

---

### Step 1 — Create Azure Resources

```bash
# Variables — change these
RESOURCE_GROUP="zoom-clone-rg"
LOCATION="eastus"
ACR_NAME="zoomcloneacr"           # must be globally unique, lowercase
BACKEND_APP="zoom-backend-app"
FRONTEND_APP="zoom-frontend-app"
APP_SERVICE_PLAN="zoom-plan"

# Create Resource Group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create Azure Container Registry
az acr create \
  --resource-group $RESOURCE_GROUP \
  --name $ACR_NAME \
  --sku Basic \
  --admin-enabled true

# Get ACR credentials
az acr credential show --name $ACR_NAME

# Create App Service Plan (Linux, B1 tier)
az appservice plan create \
  --name $APP_SERVICE_PLAN \
  --resource-group $RESOURCE_GROUP \
  --is-linux \
  --sku B1

# Create Backend Web App for Containers
az webapp create \
  --resource-group $RESOURCE_GROUP \
  --plan $APP_SERVICE_PLAN \
  --name $BACKEND_APP \
  --deployment-container-image-name $ACR_NAME.azurecr.io/zoom-backend:latest

# Create Frontend Web App for Containers
az webapp create \
  --resource-group $RESOURCE_GROUP \
  --plan $APP_SERVICE_PLAN \
  --name $FRONTEND_APP \
  --deployment-container-image-name $ACR_NAME.azurecr.io/zoom-frontend:latest
```

---

### Step 2 — Set App Settings

```bash
# Backend port
az webapp config appsettings set \
  --resource-group $RESOURCE_GROUP \
  --name $BACKEND_APP \
  --settings WEBSITES_PORT=8000

# Frontend — point it to the backend Azure URL
BACKEND_URL="https://$BACKEND_APP.azurewebsites.net"

az webapp config appsettings set \
  --resource-group $RESOURCE_GROUP \
  --name $FRONTEND_APP \
  --settings WEBSITES_PORT=3000 NEXT_PUBLIC_API_URL=$BACKEND_URL
```

---

### Step 3 — Add GitHub Secrets

Go to **GitHub → Your Repo → Settings → Secrets and variables → Actions** and add:

| Secret Name | Value |
|---|---|
| `ACR_LOGIN_SERVER` | `zoomcloneacr.azurecr.io` |
| `ACR_USERNAME` | From `az acr credential show` |
| `ACR_PASSWORD` | From `az acr credential show` |
| `AZURE_CREDENTIALS` | JSON from `az ad sp create-for-rbac` (see below) |
| `BACKEND_APP_NAME` | `zoom-backend-app` |
| `FRONTEND_APP_NAME` | `zoom-frontend-app` |
| `BACKEND_URL` | `https://zoom-backend-app.azurewebsites.net` |

To get `AZURE_CREDENTIALS`:
```bash
az ad sp create-for-rbac \
  --name "zoom-clone-deploy" \
  --role contributor \
  --scopes /subscriptions/<YOUR_SUBSCRIPTION_ID>/resourceGroups/$RESOURCE_GROUP \
  --sdk-auth
```
Copy the entire JSON output as the `AZURE_CREDENTIALS` secret.

---

### Step 4 — Deploy

Push to `main` — the GitHub Actions workflow (`.github/workflows/azure-deploy.yml`) will automatically:
1. Build Docker images
2. Push to Azure Container Registry
3. Deploy backend to `zoom-backend-app.azurewebsites.net`
4. Deploy frontend to `zoom-frontend-app.azurewebsites.net`

Or trigger manually from GitHub → Actions → "Build & Deploy to Azure" → Run workflow.

---

### Step 5 — Configure CORS on Backend (Production)

After deploying, update the backend `main.py` CORS origins with your Azure frontend URL:

```python
allow_origins=[
    "http://localhost:3000",
    "https://zoom-frontend-app.azurewebsites.net",  # Add your Azure URL
]
```

---

## Architecture Overview

```
[User Browser]
      │
      ▼
[Azure App Service — Frontend]    port 3000
   Next.js (standalone)
      │  API calls
      ▼
[Azure App Service — Backend]     port 8000
   FastAPI + SQLite
      │
      ▼
[Persistent Volume / SQLite file]
```

> **Note:** For production at scale, replace SQLite with Azure SQL or PostgreSQL. SQLite works perfectly for demos and small teams.
