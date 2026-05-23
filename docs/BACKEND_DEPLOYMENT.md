# Deploying the Backend Infrastructure

Because your backend consists of **13 interconnected Docker containers** (Node.js microservices, a Python Vector DB, MongoDB, and Socket.io), it requires a host that supports `docker-compose`. 

You cannot use Vercel, Netlify, or standard shared hosting. You have two main options:

---

## Option 1: The Easy Way (Render.com or Railway.app)
Platforms like [Railway](https://railway.app/) and [Render](https://render.com/) specialize in taking a single GitHub repository with a `docker-compose.yml` file and automatically turning it into live, cloud-hosted microservices.

*(Note: These services are no longer completely free for large architectures. Hosting 13 containers will likely cost $10-$20/month, but requires zero server maintenance).*

### Deploying via Railway
1. Create an account on [Railway.app](https://railway.app/).
2. Click **New Project** -> **Deploy from GitHub repo**.
3. Select your repository (`-RAG-Driven-Personal-Finance-Assistants`).
4. Railway will automatically detect the `docker-compose.yml` file and start building all the services (API Gateway, MongoDB, RAG Processor, LLM Service, etc.).
5. **Add Environment Variables:** 
   Go to the "Variables" tab for your project and add:
   - `GEMINI_API_KEY=your_key_here`
6. **Expose the API Gateway:**
   Click on the `api-gateway` service -> Settings -> Generate Domain. 
   *(This gives you a public URL like `https://api-gateway-production.up.railway.app`)*.
7. **Update Vercel:**
   Copy the URL above. Go to your frontend Vercel project -> Settings -> Environment Variables.
   - Add `VITE_API_URL` = `https://api-gateway-production.up.railway.app/api`
   - Add `VITE_SOCKET_URL` = `https://chat-service-production.up.railway.app` (generate domain for chat-service).
8. Redeploy your Vercel frontend. Your UI is now talking to your cloud backend!

---

## Option 2: The Cheap & Flexible Way (AWS EC2, DigitalOcean, Linode)
If you want to run everything for exactly $6-$10 a month, rent a virtual Linux server (VPS). This requires a bit of Linux terminal knowledge.

### Step 1: Rent a Server
1. Go to [DigitalOcean](https://www.digitalocean.com/) or [AWS](https://aws.amazon.com/ec2/).
2. Create an **Ubuntu 24.04** Droplet/Instance with at least **2GB of RAM** (Docker containers require memory).

### Step 2: Install Docker on the Server
Open your terminal (Powershell/Mac) and SSH into your new server:
```bash
ssh root@your_server_ip
```
Run this script to install Docker and Docker-Compose:
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.5/docker-compose-linux-x86_64" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### Step 3: Clone Your Code
```bash
git clone https://github.com/Harsh11271/-RAG-Driven-Personal-Finance-Assistants.git
cd -RAG-Driven-Personal-Finance-Assistants
```

### Step 4: Setup API Keys
Before you start the containers, you must create a `.env` file just like you did on your PC:
```bash
nano .env
```
Paste in:
```env
GEMINI_API_KEY=your_api_key_here
```
*(Press `Ctrl+X`, then `Y`, then `Enter` to save).*

### Step 5: Start the Backend!
Exactly the same command you run locally:
```bash
docker-compose up --build -d
```
All 13 containers will download and spin up in the cloud.

### Step 6: Connect Vercel
Your backend is now live at your server's IP address!
Go to your **Vercel** project settings and add:
- `VITE_API_URL` = `http://YOUR_SERVER_IP:3000/api`
- `VITE_SOCKET_URL` = `http://YOUR_SERVER_IP:3002`

Redeploy Vercel. Done!

---

## 🔒 A Note on Security (For VPS Deployment)
If you deploy to a raw VPS (Option 2), your API Gateway is exposed over HTTP (not HTTPS). Modern browsers will block a secure Vercel site (`https`) from talking to an unsecured API (`http`). 

To fix this for production, you must put [Nginx Revers Proxy with Certbot/LetsEncrypt](https://www.digitalocean.com/community/tutorials/how-to-secure-nginx-with-let-s-encrypt-on-ubuntu-20-04) in front of your port 3000 to get a free SSL certificate. Option 1 (Railway/Render) handles this SSL automatically.
