# Deploying the Frontend to Vercel

Vercel is a global platform designed specifically for frontend frameworks and static sites. Because your Personal Finance Assistant relies on **13 Dockerized microservices** (including a Python Vector Database, MongoDB, Express servers, and Socket.io), **you cannot deploy the entire backend architecture to Vercel.**

However, you **can and should** deploy the React/Vite frontend UI to Vercel, and host the backend microservices elsewhere (like AWS, Render, or Railway).

Here is the exact guide to deploying your frontend (`finance-assistant/frontend/web`) to Vercel.

---

## Step 1: Push your Code to GitHub
You have already committed and pushed to `main`. Ensure your latest frontend code is on GitHub.

## Step 2: Create a Vercel Account
1. Go to [Vercel.com](https://vercel.com/) and sign up using your GitHub account.
2. Grant Vercel permission to access your GitHub repositories.

## Step 3: Import the Project
1. From your Vercel Dashboard, click **"Add New" -> "Project"**.
2. Find the `-RAG-Driven-Personal-Finance-Assistants` repository and click **"Import"**.

## Step 4: Configure the Build Settings
This is the most critical step. Since your React app is inside a subfolder, you must tell Vercel where to look.

1. **Framework Preset:** Vercel should automatically detect **Vite**.
2. **Root Directory:** Click "Edit" and type `frontend/web`. This tells Vercel that the `package.json` and React code live inside this folder, not the root of the repo.
3. **Build Command:** Leave as default (`npm run build`).
4. **Output Directory:** Leave as default (`dist`).

## Step 5: Configure Environment Variables
If your React app needs to know where the live backend is hosted (once you deploy the backend), add it here.
For example, if you deploy your API Gateway to Render:
- **Key:** `VITE_API_URL`
- **Value:** `https://your-backend-gateway-url.onrender.com/api`

*(Note: Currently, your frontend hardcodes `http://localhost:3000/api` in `api.js`. You will eventually need to change this to an environment variable so Vercel can talk to a live server).*

## Step 6: Deploy!
Click the **"Deploy"** button.
Vercel will install your npm packages, run the Vite build, and assign you a live, free `.vercel.app` domain with SSL!

---

## What About the Backend? (The 13 Microservices)
Since Vercel cannot run Docker Compose, MongoDB, or background Python RAG processors, you will need a separate platform to host the backend.

**Recommended Free/Cheap Backend Hosts:**
1. **Render.com:** Easiest option. You can provision a PostgreSQL db, Redis, and Web Services directly from your GitHub repo.
2. **Railway.app:** Excellent for Docker environments. You can run `docker-compose` directly on Railway.
3. **AWS EC2 / DigitalOcean Droplet:** The most flexible. You can rent a $10/month Linux VPS, clone your repo, and run `docker-compose up --build -d` exactly like you did on your local PC!
